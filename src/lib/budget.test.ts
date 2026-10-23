import { describe, expect, it } from "vitest";

import { budgetHealth, budgetSummary, categoryMatches, findLowestQuote } from "./budget";
import type { VendorRecord } from "./schema";

function summaryFor(planned: number, total: number) {
  return budgetSummary([{ amount: planned }], total);
}

describe("budgetSummary", () => {
  it("adds categories and reports what remains", () => {
    const summary = budgetSummary([{ amount: 150_000 }, { amount: 144_000 }], 450_000);

    expect(summary.planned).toBe(294_000);
    expect(summary.remaining).toBe(156_000);
    expect(summary.utilisation).toBeCloseTo(294_000 / 450_000);
    expect(summary.overBudget).toBe(false);
  });

  it("flags a plan that exceeds the total", () => {
    const summary = summaryFor(500_000, 450_000);

    expect(summary.overBudget).toBe(true);
    expect(summary.remaining).toBe(-50_000);
  });

  it("treats a zero total as fully unallocated", () => {
    const summary = summaryFor(0, 0);

    expect(summary.utilisation).toBe(0);
    expect(summary.overBudget).toBe(false);
  });
});

describe("budgetHealth", () => {
  it("is over when the plan exceeds the total", () => {
    expect(budgetHealth(summaryFor(500_000, 450_000))).toBe("over");
  });

  it("is tight from 85% planned", () => {
    expect(budgetHealth(summaryFor(382_500, 450_000))).toBe("tight");
    expect(budgetHealth(summaryFor(384_750, 450_000))).toBe("tight");
  });

  it("is healthy below 85%", () => {
    expect(budgetHealth(summaryFor(382_499, 450_000))).toBe("healthy");
  });
});

function vendor(overrides: Partial<VendorRecord> & Pick<VendorRecord, "id">): VendorRecord {
  return {
    eventId: "event-1",
    name: overrides.id,
    category: "Catering",
    contact: "",
    estimatedCost: 0,
    quotedCost: 0,
    status: "contacted",
    followUpDate: "",
    notes: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("categoryMatches", () => {
  it("matches words regardless of accents or case", () => {
    expect(categoryMatches("Decor", "Décor extras")).toBe(true);
    expect(categoryMatches("DÉCOR", "Decor")).toBe(true);
  });

  it("ignores short and filler words", () => {
    expect(categoryMatches("and extras", "Décor")).toBe(false);
  });
});

describe("findLowestQuote", () => {
  it("picks the lowest active quote for a matching category", () => {
    const vendors = [
      vendor({ id: "high", quotedCost: 14_000 }),
      vendor({ id: "declined", quotedCost: 8_000, status: "declined" }),
      vendor({ id: "no-quote", quotedCost: 0 }),
      vendor({ id: "low", quotedCost: 11_000 }),
      vendor({ id: "unrelated", category: "Photography", quotedCost: 5_000 }),
    ];

    expect(findLowestQuote(vendors, "Catering")?.id).toBe("low");
  });

  it("returns null when no quote matches", () => {
    expect(findLowestQuote([vendor({ id: "photo", category: "Photography" })], "Catering")).toBeNull();
    expect(findLowestQuote([vendor({ id: "zero", quotedCost: 0 })], "Catering")).toBeNull();
  });
});
