import { describe, expect, it } from "vitest";

import { aiIdeaKey } from "./ideas";
import type { GeneratedIdea } from "./schema";
import { emptyState } from "./seed";
import { reducer } from "./store";

function idea(id: string, action: GeneratedIdea["action"]): GeneratedIdea {
  return {
    id,
    eventId: "event-1",
    action,
    section: action === "next-steps" ? "experience" : "themes",
    title: `Idea ${id}`,
    detail: "Detail",
    why: "",
    impact: "",
    priority: "medium",
    costMin: null,
    costMax: null,
    costNote: "",
    nextStep: "",
    model: "gemini-3.5-flash-lite",
    generatedAt: "2026-10-21T00:00:00.000Z",
  };
}

describe("set-generated-ideas", () => {
  it("replaces unsaved ideas for one action and keeps saved or set-aside cards", () => {
    const saved = idea("saved", "themes");
    const dismissed = idea("dismissed", "themes");
    const replaced = idea("replaced", "themes");
    const otherAction = idea("other", "next-steps");
    const state = {
      ...emptyState(),
      generatedIdeas: [saved, dismissed, replaced, otherAction],
      savedIdeas: [aiIdeaKey("event-1", "saved")],
      dismissedIdeas: [aiIdeaKey("event-1", "dismissed")],
    };

    const next = reducer(state, {
      type: "set-generated-ideas",
      eventId: "event-1",
      aiAction: "themes",
      ideas: [idea("fresh", "themes")],
    });

    expect(next.generatedIdeas.map((item) => item.id)).toEqual([
      "other",
      "saved",
      "dismissed",
      "fresh",
    ]);
    expect(next.savedIdeas).toEqual(state.savedIdeas);
    expect(next.dismissedIdeas).toEqual(state.dismissedIdeas);
  });
});
