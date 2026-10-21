import { describe, expect, it } from "vitest";

import { appStateSchema, eventInputSchema, validateEventInput, vendorInputSchema } from "./schema";

const validEvent = {
  name: "Meera & Arjun's Wedding",
  type: "wedding" as const,
  date: "2026-12-12",
  location: "Mumbai, India",
  guests: 120,
  totalBudget: 450_000,
  theme: "Warm ivory and marigold",
  priorities: ["food", "photography"] as const,
};

describe("eventInputSchema", () => {
  it("accepts a complete event", () => {
    expect(eventInputSchema.safeParse(validEvent).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const parsed = eventInputSchema.safeParse({ ...validEvent, name: " " });
    expect(parsed.success).toBe(false);
  });

  it("rejects a fractional guest count", () => {
    const parsed = eventInputSchema.safeParse({ ...validEvent, guests: 12.5 });
    expect(parsed.success).toBe(false);
  });
});

describe("validateEventInput", () => {
  it("accepts today and future dates", () => {
    expect(validateEventInput({ ...validEvent, date: "2026-10-21" }, "2026-10-21").ok).toBe(true);
  });

  it("rejects past dates with a field error", () => {
    const result = validateEventInput({ ...validEvent, date: "2026-10-20" }, "2026-10-21");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.date).toBeTruthy();
  });
});

describe("vendorInputSchema", () => {
  const vendor = {
    name: "Spice Route Catering",
    category: "Catering",
    contact: "+91 90000 00002",
    estimatedCost: 144_000,
    quotedCost: 144_000,
    status: "contacted" as const,
    followUpDate: "",
    notes: "",
  };

  it("allows a blank follow-up date", () => {
    expect(vendorInputSchema.safeParse(vendor).success).toBe(true);
  });

  it("rejects an impossible follow-up date", () => {
    const parsed = vendorInputSchema.safeParse({ ...vendor, followUpDate: "2026-02-30" });
    expect(parsed.success).toBe(false);
  });
});

describe("appStateSchema", () => {
  it("requires the current version", () => {
    const state = {
      version: 2,
      events: [],
      activeEventId: null,
      budgetItems: [],
      tasks: [],
      vendors: [],
    };
    expect(appStateSchema.safeParse(state).success).toBe(false);
  });
});
