import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import { POST } from "./route";

function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "event-1",
    action: "themes",
    event: {
      name: "Meera & Arjun's Wedding",
      type: "wedding",
      date: "2026-12-16",
      location: "Mumbai, India",
      guests: 120,
      totalBudget: 450_000,
      currency: "INR",
      theme: "Ivory and marigold",
      priorities: ["food", "guests"],
    },
    budgetItems: [{ name: "Catering", amount: 144_000 }],
    constraints: "Vegetarian menu, wheelchair access",
    ...overrides,
  };
}

function modelIdea(index = 0) {
  return {
    title: `Gemini idea ${index}`,
    description: "A specific, practical suggestion for this celebration.",
    whyItFits: "It matches the saved theme and guest priorities.",
    priority: "medium",
    budgetImpact: "Uses part of the catering allocation.",
    costMin: 10_000,
    costMax: 18_000,
    costNote: "Rough range, not a quote",
    nextStep: "Ask the caterer to price this option.",
  };
}

function modelPayload(count = 4) {
  return {
    text: JSON.stringify({
      ideas: Array.from({ length: count }, (_, index) => modelIdea(index)),
    }),
  };
}

function post(body: unknown, ip = crypto.randomUUID()) {
  return POST(
    new Request("http://localhost:3000/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

function rawPost(body: BodyInit, headers: Record<string, string> = {}, ip = crypto.randomUUID()) {
  return POST(
    new Request("http://localhost:3000/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip, ...headers },
      body,
    }),
  );
}

function streamOf(text: string, chunkSize = 1_024): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
        controller.enqueue(bytes.slice(offset, offset + chunkSize));
      }
      controller.close();
    },
  });
}

function streamRequest(body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}) {
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID(), ...headers },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" };
  return new Request("http://localhost:3000/api/ideas", init);
}

function streamPost(body: ReadableStream<Uint8Array>, headers: Record<string, string> = {}) {
  return POST(streamRequest(body, headers));
}

function exactLimitBody(): string {
  const envelope = JSON.stringify({ ...requestBody(), padding: "" });
  const pad = "x".repeat(16 * 1024 - new TextEncoder().encode(envelope).byteLength);
  return JSON.stringify({ ...requestBody(), padding: pad });
}

beforeEach(() => {
  generateContent.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
  vi.stubEnv("GEMINI_MODEL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/ideas", () => {
  it("returns validated, persisted-ready ideas for a supported action", async () => {
    generateContent.mockResolvedValue(modelPayload());
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ideas).toHaveLength(4);
    expect(body.model).toBe("gemini-3.8-flash");
    expect(body.promptVersion).toBeTruthy();
    expect(body.ideas[0]).toMatchObject({
      eventId: "event-1",
      action: "themes",
      section: "themes",
      costMin: 10_000,
      costMax: 18_000,
      model: "gemini-3.8-flash",
    });
    expect(JSON.stringify(body)).not.toContain("test-key-not-real");
  });

  it("clips overlong model prose and drops absurd cost ranges", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        ideas: [
          {
            ...modelIdea(),
            title: "T".repeat(120),
            description: "D".repeat(600),
            whyItFits: "W".repeat(400),
            costMin: 5,
            costMax: 500_000_000,
            nextStep: "N".repeat(300),
          },
        ],
      }),
    });
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ideas[0].title).toHaveLength(90);
    expect(body.ideas[0].detail).toHaveLength(500);
    expect(body.ideas[0].why).toHaveLength(300);
    expect(body.ideas[0].nextStep).toHaveLength(200);
    expect(body.ideas[0].costMin).toBeNull();
    expect(body.ideas[0].costMax).toBeNull();
  });

  it("sends event facts and constraints to Gemini", async () => {
    generateContent.mockResolvedValue(modelPayload());
    await post(requestBody({ action: "food" }));

    const call = generateContent.mock.calls[0][0];
    expect(call.model).toBe("gemini-3.8-flash");
    expect(call.contents).toContain("Meera & Arjun's Wedding");
    expect(call.contents).toContain("Ivory and marigold");
    expect(call.contents).toContain("Vegetarian menu, wheelchair access");
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.config.httpOptions.timeout).toBeGreaterThan(0);
    expect(call.config.maxOutputTokens).toBeGreaterThan(0);
  });

  it("maps budget-improvement and next-steps into the right sections", async () => {
    generateContent.mockResolvedValue(modelPayload(1));
    const budget = await (await post(requestBody({ action: "budget-improvement" }))).json();
    const next = await (await post(requestBody({ action: "next-steps" }))).json();

    expect(budget.ideas[0].section).toBe("savings");
    expect(next.ideas[0].section).toBe("experience");
  });

  it("returns a sanitized 503 when the API key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("not_configured");
    expect(body.error.message).toContain("GEMINI_API_KEY");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects invalid requests before calling Gemini", async () => {
    const badAction = await post(requestBody({ action: "make-it-viral" }));
    expect(badAction.status).toBe(400);

    const badEvent = await post(
      requestBody({ event: { ...requestBody().event, guests: 0 } }),
    );
    const body = await badEvent.json();
    expect(badEvent.status).toBe(400);
    expect(body.error.fields["event.guests"]).toBeTruthy();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects unknown top-level fields", async () => {
    const response = await post({ ...requestBody(), role: "admin" });
    expect(response.status).toBe(400);
  });

  it("maps malformed model output to a sanitized 502", async () => {
    generateContent.mockResolvedValue({ text: "not json" });
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("invalid_output");
  });

  it("rejects model output outside the response contract", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        ideas: [{ ...modelIdea(), priority: "urgent" }],
      }),
    });
    const response = await post(requestBody());
    expect(response.status).toBe(502);
  });

  it("maps provider timeouts without leaking the provider message", async () => {
    generateContent.mockRejectedValue(new Error("request timed out after 20000ms"));
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body.error.code).toBe("timeout");
    expect(body.error.message).not.toContain("20000");
  });

  it("maps provider gateway timeouts to 504", async () => {
    generateContent.mockRejectedValue(
      Object.assign(new Error("provider gateway timeout"), { status: 504 }),
    );
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body.error.code).toBe("timeout");
    expect(body.error.message).not.toContain("gateway");
  });

  it("maps provider rate limits", async () => {
    generateContent.mockRejectedValue(
      Object.assign(new Error("quota exceeded"), { status: 429 }),
    );
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("rate_limited");
  });

  it("returns a generic 502 without leaking provider details", async () => {
    generateContent.mockRejectedValue(new Error("socket hang up at 10.0.0.1"));
    const response = await post(requestBody());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("10.0.0.1");
  });

  it("accepts a valid body below the limit", async () => {
    generateContent.mockResolvedValue(modelPayload());
    const body = JSON.stringify(requestBody());
    expect(new TextEncoder().encode(body).byteLength).toBeLessThan(16 * 1024);

    const response = await rawPost(body);
    expect(response.status).toBe(200);
  });

  it("accepts valid JSON exactly at the 16 KB boundary without treating it as oversized", async () => {
    const body = exactLimitBody();
    expect(new TextEncoder().encode(body).byteLength).toBe(16 * 1024);

    // Padding is an unknown field, so the schema rejects it with 400. The
    // important assertion is that the byte cap itself does not return 413.
    const response = await rawPost(body);
    expect(response.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("enforces the limit on a chunked body with no Content-Length", async () => {
    const body = JSON.stringify({ padding: "x".repeat(20_000) });
    const request = streamRequest(streamOf(body));
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("stops reading and cancels the stream as soon as the limit is exceeded", async () => {
    let pulls = 0;
    let cancelled = false;
    const oversized = new Uint8Array(17 * 1024);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) {
          controller.enqueue(oversized);
          return;
        }
        controller.error(new Error("reader kept going after the cap"));
      },
      cancel() {
        cancelled = true;
      },
    });

    const response = await streamPost(stream);
    expect(response.status).toBe(413);
    expect(pulls).toBe(1);
    expect(cancelled).toBe(true);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("reads a valid chunked body with no Content-Length", async () => {
    generateContent.mockResolvedValue(modelPayload());
    const request = streamRequest(streamOf(JSON.stringify(requestBody()), 64));
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("does not trust a misleading low Content-Length", async () => {
    const response = await rawPost(
      JSON.stringify({ padding: "x".repeat(20_000) }),
      { "content-length": "10" },
    );
    expect(response.status).toBe(413);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns a sanitized 400 for malformed JSON", async () => {
    const response = await rawPost("{");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe("Send a JSON request body.");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns a sanitized 400 for an empty body", async () => {
    const response = await rawPost("");
    expect(response.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns a sanitized 400 when the request stream fails", async () => {
    let sent = false;
    const failing = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!sent) {
          sent = true;
          controller.enqueue(new TextEncoder().encode('{"eventId":'));
          return;
        }
        controller.error(new Error("socket reset at 10.0.0.1"));
      },
    });

    const response = await streamPost(failing);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe("Send a JSON request body.");
    expect(JSON.stringify(body)).not.toContain("10.0.0.1");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects an oversized body", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID() },
        body: JSON.stringify({ padding: "x".repeat(20_000) }),
      }),
    );
    expect(response.status).toBe(413);
  });

  it("rejects a body over 16 KB in UTF-8 even when its character count is lower", async () => {
    const body = JSON.stringify({ padding: "界".repeat(6_000) });
    expect(body.length).toBeLessThan(16 * 1024);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(16 * 1024);

    const response = await POST(
      new Request("http://localhost:3000/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": crypto.randomUUID() },
        body,
      }),
    );

    expect(response.status).toBe(413);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
