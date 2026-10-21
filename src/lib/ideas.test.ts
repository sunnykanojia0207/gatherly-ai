import { describe, expect, it } from "vitest";

import { formatINR } from "./format";
import {
  aiIdeaKey,
  ideaBelongsToEvent,
  ideaFit,
  ideaKey,
  ideaTaskDueDate,
} from "./ideas";
import type { BudgetItem, EventRecord } from "./schema";

function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    name: "Meera & Arjun's Wedding",
    type: "wedding",
    date: "2026-12-16",
    location: "Mumbai",
    guests: 120,
    totalBudget: 450_000,
    theme: "Ivory and marigold",
    priorities: ["food"],
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function item(name: string, amount: number): BudgetItem {
  return { id: `item-${name}`, eventId: "event-1", name, amount };
}

describe("ideaKey", () => {
  it("is stable across renders and scoped to one event", () => {
    expect(ideaKey("event-1", "food", "Late-night chaat counter")).toBe(
      "event-1|food|Late-night chaat counter",
    );
  });
});

describe("aiIdeaKey", () => {
  it("separates AI ideas from curated titles and stays event-scoped", () => {
    const key = aiIdeaKey("event-1", "ai-idea-1");
    expect(key).toBe("event-1|ai|ai-idea-1");
    expect(key).not.toBe(ideaKey("event-1", "themes", "Marigold courtyard"));
    expect(ideaBelongsToEvent(key, "event-1")).toBe(true);
    expect(ideaBelongsToEvent(key, "event-10")).toBe(false);
  });
});

describe("ideaBelongsToEvent", () => {
  it("uses the full event prefix so similar ids do not collide", () => {
    const key = ideaKey("event-1", "food", "Chaat");
    expect(ideaBelongsToEvent(key, "event-1")).toBe(true);
    expect(ideaBelongsToEvent(key, "event-10")).toBe(false);
    expect(ideaBelongsToEvent(ideaKey("event-10", "food", "Chaat"), "event-1")).toBe(false);
  });
});

describe("ideaTaskDueDate", () => {
  it("aims for two weeks before the event", () => {
    expect(ideaTaskDueDate("2026-12-16", "2026-10-21")).toBe("2026-12-02");
  });

  it("never sets a task date in the past", () => {
    expect(ideaTaskDueDate("2026-10-25", "2026-10-21")).toBe("2026-10-21");
  });
});

describe("ideaFit", () => {
  it("reads the matching category amount when one exists", () => {
    const fit = ideaFit("food", event(), [item("Catering", 144_000)]);
    expect(fit.impact).toBe(`Catering plan: ${formatINR(144_000)}`);
    expect(fit.why).toContain("Great food");
  });

  it("does not invent a category budget that is not saved", () => {
    const fit = ideaFit("experience", event(), [item("Catering", 144_000)]);
    expect(fit.impact).toBe("Entertainment budget not set");

    const empty = ideaFit("decor", event(), [item("Venue & decor", 0)]);
    expect(empty.impact).toBe("Décor budget not set");
  });

  it("compares savings ideas against the real unallocated buffer", () => {
    const fit = ideaFit(
      "savings",
      event({ totalBudget: 200_000, priorities: ["budget"] }),
      [item("Catering", 150_000)],
    );
    expect(fit.impact).toBe(`Today’s buffer: ${formatINR(50_000)}`);
    expect(fit.why).toContain("Budget-friendly");
  });

  it("falls back to the saved theme, then to event facts", () => {
    const themed = ideaFit("decor", event({ priorities: [] }), []);
    expect(themed.impact).toBe("Décor budget not set");
    expect(themed.why).toContain("Ivory and marigold");

    const plain = ideaFit("food", event({ priorities: [], theme: "" }), []);
    expect(plain.why).toContain("120 guests");
  });
});
