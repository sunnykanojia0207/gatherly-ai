import { describe, expect, it } from "vitest";

import { buildNextMoves } from "./insights";
import { addDays, formatINR } from "./format";
import type {
  BudgetItem,
  EventRecord,
  TaskRecord,
  VendorRecord,
} from "./schema";

const TODAY = "2026-10-21";

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

function item(name: string, amount: number, overrides: Partial<BudgetItem> = {}): BudgetItem {
  return { id: `item-${name}`, eventId: "event-1", name, amount, ...overrides };
}

function task(overrides: Partial<TaskRecord> & Pick<TaskRecord, "id">): TaskRecord {
  return {
    eventId: "event-1",
    title: overrides.id,
    dueDate: addDays(TODAY, 30),
    priority: "medium",
    done: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

function vendor(overrides: Partial<VendorRecord> & Pick<VendorRecord, "id">): VendorRecord {
  return {
    eventId: "event-1",
    name: overrides.id,
    category: "Catering",
    contact: "",
    estimatedCost: 0,
    quotedCost: 0,
    status: "considering",
    followUpDate: "",
    notes: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildNextMoves", () => {
  it("starts with an unallocated budget, then the empty timeline and vendor list", () => {
    const moves = buildNextMoves({
      event: event(),
      budgetItems: [],
      tasks: [],
      vendors: [],
      today: TODAY,
    });

    expect(moves.map((move) => move.id)).toEqual([
      "budget-remaining",
      "no-tasks",
      "no-vendors",
    ]);
  });

  it("puts overdue tasks first and caps the list at three moves", () => {
    const moves = buildNextMoves({
      event: event(),
      budgetItems: [item("Catering", 160_000)],
      tasks: [
        task({ id: "late-two", title: "Confirm menu", dueDate: "2026-10-19" }),
        task({ id: "late-one", title: "Book pandit", dueDate: "2026-10-20" }),
        task({ id: "late-three", title: "Order invites", dueDate: "2026-10-18" }),
      ],
      vendors: [vendor({ id: "Spice Route", followUpDate: "2026-10-22" })],
      today: TODAY,
    });

    expect(moves).toHaveLength(3);
    expect(moves[0].id).toBe("overdue");
    expect(moves[0].detail).toContain("Order invites");
  });

  it("flags an over-budget plan with the exact amount to trim", () => {
    const moves = buildNextMoves({
      event: event({ totalBudget: 100_000 }),
      budgetItems: [item("Catering", 130_000)],
      tasks: [task({ id: "menu" })],
      vendors: [vendor({ id: "Spice Route" })],
      today: TODAY,
    });

    expect(moves[0].id).toBe("over-budget");
    expect(moves[0].title).toContain(formatINR(30_000));
  });

  it("recognises a fully allocated budget instead of calling it unallocated", () => {
    const moves = buildNextMoves({
      event: event({ totalBudget: 100_000 }),
      budgetItems: [item("Catering", 100_000)],
      tasks: [task({ id: "menu" })],
      vendors: [vendor({ id: "Spice Route" })],
      today: TODAY,
    });

    expect(moves.map((move) => move.id)).toContain("budget-full");
    expect(moves.map((move) => move.id)).not.toContain("budget-remaining");
  });

  it("only surfaces vendor follow-ups inside the seven-day window and ignores declined vendors", () => {
    const moves = buildNextMoves({
      event: event({ totalBudget: 100_000 }),
      budgetItems: [item("Catering", 90_000)],
      tasks: [task({ id: "menu" })],
      vendors: [
        vendor({ id: "Too Far", followUpDate: addDays(TODAY, 8) }),
        vendor({ id: "Declined", status: "declined", followUpDate: addDays(TODAY, 2) }),
        vendor({ id: "Late Call", followUpDate: "2026-10-20" }),
      ],
      today: TODAY,
    });

    const followUp = moves.find((move) => move.kicker === "Vendors");
    expect(followUp?.title).toBe("Follow up with Late Call");
    expect(followUp?.tone).toBe("warning");
  });

  it("adds a milestone only when the next task is within two weeks", () => {
    const soon = buildNextMoves({
      event: event({ totalBudget: 100_000 }),
      budgetItems: [item("Catering", 90_000)],
      tasks: [task({ id: "Final headcount", dueDate: addDays(TODAY, 10) })],
      vendors: [vendor({ id: "Spice Route" })],
      today: TODAY,
    });
    const later = buildNextMoves({
      event: event({ totalBudget: 100_000 }),
      budgetItems: [item("Catering", 90_000)],
      tasks: [task({ id: "Final headcount", dueDate: addDays(TODAY, 20) })],
      vendors: [vendor({ id: "Spice Route" })],
      today: TODAY,
    });

    expect(soon.some((move) => move.kicker === "Next milestone")).toBe(true);
    expect(later.some((move) => move.kicker === "Next milestone")).toBe(false);
  });

  it("falls back to a calm, positive move when nothing needs attention", () => {
    const moves = buildNextMoves({
      event: event({ totalBudget: 100_000 }),
      budgetItems: [item("Catering", 80_000)],
      tasks: [task({ id: "menu", dueDate: addDays(TODAY, 30) })],
      vendors: [vendor({ id: "Spice Route", status: "booked" })],
      today: TODAY,
    });

    expect(moves).toEqual([
      expect.objectContaining({ id: "steady", tone: "positive" }),
    ]);
  });
});
