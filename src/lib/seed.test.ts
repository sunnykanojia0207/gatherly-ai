import { describe, expect, it } from "vitest";

import {
  BUDGET_CATEGORY_NAMES,
  DEMO_EVENT_ID,
  DEMO_TOTAL_BUDGET,
  createBudgetItems,
  createDemoSeed,
  emptyState,
} from "./seed";

describe("demo seed", () => {
  const seed = createDemoSeed("2026-10-21");

  it("keeps the demo budget at exactly ₹4,50,000", () => {
    const total = seed.budgetItems.reduce((sum, item) => sum + item.amount, 0);

    expect(total).toBe(DEMO_TOTAL_BUDGET);
    expect(seed.event.totalBudget).toBe(DEMO_TOTAL_BUDGET);
    expect(seed.budgetItems).toHaveLength(BUDGET_CATEGORY_NAMES.length);
  });

  it("dates the wedding 56 days out", () => {
    expect(seed.event.date).toBe("2026-12-16");
    expect(seed.event.id).toBe(DEMO_EVENT_ID);
  });

  it("starts with tasks and vendors attached to the demo event", () => {
    expect(seed.tasks.length).toBeGreaterThan(0);
    expect(seed.vendors.length).toBeGreaterThan(0);
    expect(seed.tasks.every((task) => task.eventId === DEMO_EVENT_ID)).toBe(true);
    expect(seed.vendors.every((vendor) => vendor.eventId === DEMO_EVENT_ID)).toBe(true);
  });

  it("has unique ids within each collection", () => {
    const ids = [
      ...seed.budgetItems.map((item) => item.id),
      ...seed.tasks.map((task) => task.id),
      ...seed.vendors.map((vendor) => vendor.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("createBudgetItems", () => {
  it("creates zeroed categories for a new event", () => {
    const items = createBudgetItems("event-new");

    expect(items).toHaveLength(BUDGET_CATEGORY_NAMES.length);
    expect(items.every((item) => item.eventId === "event-new" && item.amount === 0)).toBe(true);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });
});

describe("emptyState", () => {
  it("returns independent empty collections", () => {
    const first = emptyState();
    const second = emptyState();

    expect(first.events).toEqual([]);
    expect(first.activeEventId).toBeNull();
    expect(first.events).not.toBe(second.events);
  });
});
