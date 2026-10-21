import { GoogleGenAI } from "@google/genai";

import { AI_ACTION_SECTION } from "../labels";
import { generatedIdeaSchema, type GeneratedIdea } from "../schema";
import {
  DEFAULT_AI_MODEL,
  aiModelResponseSchema,
  aiResponseJsonSchema,
  type AiIdeaRequest,
} from "./schema";
import { PROMPT_VERSION, buildPrompt } from "./prompt";

const REQUEST_TIMEOUT_MS = 40_000;
const MAX_OUTPUT_TOKENS = 2_048;

export type AiErrorCode =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "invalid_output"
  | "unavailable";

export class AiGenerationError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiGenerationError";
  }
}

export interface GeneratedIdeas {
  ideas: GeneratedIdea[];
  model: string;
  promptVersion: string;
  generatedAt: string;
}

function providerStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function classifyProviderError(error: unknown): AiGenerationError {
  const status = providerStatus(error);
  const text = error instanceof Error ? error.message : "";
  if (status === 429 || /resource_exhausted|rate limit|quota/i.test(text)) {
    return new AiGenerationError(
      "rate_limited",
      "Gemini is rate-limited right now. Wait a minute and try again.",
    );
  }
  if (status === 504 || status === 408 || /timeout|timed out|abort/i.test(text)) {
    return new AiGenerationError(
      "timeout",
      "Gemini took too long to answer. Try again in a moment.",
    );
  }
  return new AiGenerationError(
    "unavailable",
    "Gemini could not be reached. Curated ideas are still available below.",
  );
}

const MAX_COST = 100_000_000;

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trimEnd() : value;
}

function toIdea(
  raw: ReturnType<typeof aiModelResponseSchema.parse>["ideas"][number],
  request: AiIdeaRequest,
  model: string,
  generatedAt: string,
): GeneratedIdea {
  const hasCost =
    typeof raw.costMin === "number" &&
    typeof raw.costMax === "number" &&
    raw.costMin >= 0 &&
    raw.costMax >= raw.costMin &&
    raw.costMax <= MAX_COST;
  const parsed = generatedIdeaSchema.safeParse({
    id: crypto.randomUUID(),
    eventId: request.eventId,
    action: request.action,
    section: AI_ACTION_SECTION[request.action],
    // Clip prose so one long field cannot discard the whole batch.
    title: clip(raw.title, 90),
    detail: clip(raw.description, 500),
    why: clip(raw.whyItFits, 300),
    impact: clip(raw.budgetImpact, 300),
    priority: raw.priority,
    costMin: hasCost ? raw.costMin : null,
    costMax: hasCost ? raw.costMax : null,
    costNote: clip(raw.costNote, 120),
    nextStep: clip(raw.nextStep, 200),
    model,
    generatedAt,
  });
  if (!parsed.success) {
    throw new AiGenerationError(
      "invalid_output",
      "Gemini returned ideas in an unexpected shape. Nothing was saved.",
    );
  }
  return parsed.data;
}

/** Server-only. Never import this module from a client component. */
export async function generateIdeas(request: AiIdeaRequest): Promise<GeneratedIdeas> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiGenerationError(
      "not_configured",
      "Gemini is not configured here. Add GEMINI_API_KEY to enable live suggestions; curated ideas still work.",
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const { systemInstruction, contents } = buildPrompt(request);
  const client = new GoogleGenAI({ apiKey });

  let text: string | undefined;
  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: aiResponseJsonSchema(),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
      },
    });
    text = response.text;
  } catch (error) {
    console.error("[ai] Gemini request failed", {
      code: providerStatus(error) ?? "no_status",
    });
    throw classifyProviderError(error);
  }

  if (!text) {
    throw new AiGenerationError(
      "invalid_output",
      "Gemini returned an empty response. Try again.",
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiGenerationError(
      "invalid_output",
      "Gemini returned text that was not JSON. Try again.",
    );
  }

  const parsed = aiModelResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new AiGenerationError(
      "invalid_output",
      "Gemini returned ideas in an unexpected shape. Nothing was saved.",
    );
  }

  const generatedAt = new Date().toISOString();
  const seen = new Set<string>();
  const ideas: GeneratedIdea[] = [];
  for (const raw of parsed.data.ideas) {
    const key = raw.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ideas.push(toIdea(raw, request, model, generatedAt));
  }

  if (ideas.length === 0) {
    throw new AiGenerationError(
      "invalid_output",
      "Gemini did not return a usable idea. Try again.",
    );
  }

  return { ideas: ideas.slice(0, 6), model, promptVersion: PROMPT_VERSION, generatedAt };
}
