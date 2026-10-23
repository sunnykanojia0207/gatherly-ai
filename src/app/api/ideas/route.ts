import { NextResponse } from "next/server";

import { AiGenerationError, generateIdeas } from "@/lib/ai/generate";
import { aiIdeaRequestSchema } from "@/lib/ai/schema";
import { fieldErrors } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 16 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 12;

/**
 * ponytail: in-memory limiter is per-instance and resets on deploy. It slows
 * casual abuse only; production must add a platform/WAF or shared-store limit.
 */
const hits = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [id, times] of hits) {
      if (times.every((time) => now - time >= RATE_WINDOW_MS)) hits.delete(id);
    }
  }
  return recent.length > RATE_LIMIT;
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

type BodyRead =
  | { ok: true; body: string }
  | { ok: false; status: 400 | 413 };

/** Read at most the cap, then cancel the request stream immediately. */
async function readBody(request: Request): Promise<BodyRead> {
  if (!request.body) return { ok: true, body: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    return { ok: false, status: 400 };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, body: new TextDecoder().decode(bytes) };
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  if (isRateLimited(ip, Date.now())) {
    return errorResponse(
      429,
      "rate_limited",
      "Too many requests. Wait a few minutes before generating more ideas.",
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, "invalid_request", "That request is too large.");
  }

  const read = await readBody(request);
  if (!read.ok) {
    return read.status === 413
      ? errorResponse(413, "invalid_request", "That request is too large.")
      : errorResponse(400, "invalid_request", "Send a JSON request body.");
  }
  const body = read.body;

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return errorResponse(400, "invalid_request", "Send a JSON request body.");
  }

  const parsed = aiIdeaRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Check the event details and try again.",
          fields: fieldErrors(parsed.error),
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await generateIdeas(parsed.data);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AiGenerationError) {
      const status =
        error.code === "not_configured"
          ? 503
          : error.code === "timeout"
            ? 504
            : error.code === "rate_limited"
              ? 429
              : 502;
      return errorResponse(status, error.code, error.message);
    }
    console.error("[ai] unexpected route failure");
    return errorResponse(500, "unavailable", "Ideas could not be generated right now.");
  }
}
