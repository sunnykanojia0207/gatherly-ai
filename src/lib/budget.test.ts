import { describe, expect, it } from "vitest";

import { budgetHealth, budgetSummary } from "./budget";

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
