import { describe, expect, it } from "vitest";

import { AI_ACTION_SECTION, AI_ACTION_VALUES } from "../labels";
import { buildPrompt } from "./prompt";
import {
  AI_IDEA_COUNT,
  aiIdeaRequestSchema,
  aiIdeasResponseSchema,
  aiModelResponseSchema,
  aiResponseJsonSchema,
} from "./schema";

function request(overrides: Record<string, unknown> = {}) {
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
    title: `Idea ${index}`,
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

describe("aiIdeaRequestSchema", () => {
  it("accepts a complete event context", () => {
    const parsed = aiIdeaRequestSchema.safeParse(request());
    expect(parsed.success).toBe(true);
  });

  it("rejects an unsupported action", () => {
    const parsed = aiIdeaRequestSchema.safeParse(request({ action: "write-a-poem" }));
    expect(parsed.success).toBe(false);
  });

  it("rejects bad budget and guest counts", () => {
    for (const event of [
      { ...request().event, totalBudget: 0 },
      { ...request().event, totalBudget: 12.5 },
      { ...request().event, guests: 0 },
      { ...request().event, guests: 10_001 },
    ]) {
      expect(aiIdeaRequestSchema.safeParse(request({ event })).success).toBe(false);
    }
  });

  it("rejects unknown fields and oversized context", () => {
    expect(aiIdeaRequestSchema.safeParse({ ...request(), admin: true }).success).toBe(false);
    expect(
      aiIdeaRequestSchema.safeParse({ ...request(), constraints: "x".repeat(301) }).success,
    ).toBe(false);
    expect(
      aiIdeaRequestSchema.safeParse({
        ...request(),
        budgetItems: Array.from({ length: 21 }, () => ({ name: "Item", amount: 1 })),
      }).success,
    ).toBe(false);
  });
});

describe("aiModelResponseSchema", () => {
  it("accepts the expected model payload", () => {
    const parsed = aiModelResponseSchema.safeParse({
      ideas: Array.from({ length: AI_IDEA_COUNT }, (_, index) => modelIdea(index)),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty, oversized, and malformed payloads", () => {
    expect(aiModelResponseSchema.safeParse({ ideas: [] }).success).toBe(false);
    expect(
      aiModelResponseSchema.safeParse({
        ideas: Array.from({ length: 7 }, (_, index) => modelIdea(index)),
      }).success,
    ).toBe(false);
    expect(
      aiModelResponseSchema.safeParse({ ideas: [{ title: "Missing fields" }] }).success,
    ).toBe(false);
    expect(
      aiModelResponseSchema.safeParse({
        ideas: [{ ...modelIdea(), priority: "urgent" }],
      }).success,
    ).toBe(false);
  });

  it("allows cost to be omitted when it cannot be estimated", () => {
    const { costMin, costMax, costNote, ...withoutCost } = modelIdea();
    void costMin;
    void costMax;
    void costNote;
    expect(aiModelResponseSchema.safeParse({ ideas: [withoutCost] }).success).toBe(true);
  });
});

describe("aiIdeasResponseSchema", () => {
  it("validates the persisted response shape", () => {
    const idea = {
      id: "idea-1",
      eventId: "event-1",
      action: "themes",
      section: "themes",
      title: "Marigold courtyard",
      detail: "Warm low-cost styling.",
      why: "Matches the theme.",
      impact: "Uses the decor allocation.",
      priority: "low",
      costMin: null,
      costMax: null,
      costNote: "",
      nextStep: "Ask the decorator.",
      model: "gemini-3.5-flash-lite",
      generatedAt: "2026-10-21T00:00:00.000Z",
    };
    const parsed = aiIdeasResponseSchema.safeParse({
      ideas: [idea],
      model: "gemini-3.5-flash-lite",
      promptVersion: "1",
      generatedAt: "2026-10-21T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("aiResponseJsonSchema", () => {
  it("produces a Gemini-friendly schema without unsupported keywords", () => {
    const schema = aiResponseJsonSchema();
    const text = JSON.stringify(schema);
    expect(schema.$schema).toBeUndefined();
    expect(schema.type).toBe("object");
    expect(text).toContain('"ideas"');
    expect(text).toContain('"priority"');
    expect(text).toContain('"costMin"');
    expect(text).not.toContain('"default"');
    expect(text).not.toContain('"minLength"');
    expect(text).not.toContain('"maxLength"');
  });
});

describe("buildPrompt", () => {
  it("includes event facts and tells the model to treat them as data", () => {
    const parsed = aiIdeaRequestSchema.parse(request());
    const { systemInstruction, contents } = buildPrompt(parsed);
    expect(systemInstruction).toContain("untrusted data");
    expect(contents).toContain("Meera & Arjun's Wedding");
    expect(contents).toContain("Ivory and marigold");
    expect(contents).toContain("Vegetarian menu, wheelchair access");
    expect(contents).toContain(`Return ${AI_IDEA_COUNT} ideas`);
  });
});

describe("AI_ACTION_SECTION", () => {
  it("maps every action to a curated section", () => {
    for (const action of AI_ACTION_VALUES) {
      expect(AI_ACTION_SECTION[action]).toBeTruthy();
    }
  });
});
