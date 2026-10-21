import { describe, expect, it } from "vitest";

import type { TaskRecord } from "./schema";
import { isOverdue, orderTasks, taskProgress, upcomingTasks } from "./timeline";

function task(overrides: Partial<TaskRecord> & Pick<TaskRecord, "id">): TaskRecord {
  return {
    eventId: "event-1",
    title: overrides.id,
    dueDate: "2026-11-01",
    priority: "medium",
    done: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("taskProgress", () => {
  it("handles an empty list", () => {
    expect(taskProgress([])).toEqual({ total: 0, done: 0, percent: 0 });
  });

  it("rounds completion percentage", () => {
    expect(taskProgress([{ done: true }, { done: true }, { done: false }])).toEqual({
      total: 3,
      done: 2,
      percent: 67,
    });
  });
});

describe("orderTasks", () => {
  it("puts open tasks first and sorts each group by due date", () => {
    const tasks = [
      task({ id: "open-late", dueDate: "2026-12-01" }),
      task({ id: "done", dueDate: "2026-10-15", done: true }),
      task({ id: "open-soon", dueDate: "2026-11-05" }),
    ];

    expect(orderTasks(tasks).map((item) => item.id)).toEqual(["open-soon", "open-late", "done"]);
  });
});

describe("upcomingTasks", () => {
  it("skips completed tasks and respects the limit", () => {
    const tasks = [
      task({ id: "a", dueDate: "2026-11-02" }),
      task({ id: "b", dueDate: "2026-11-01" }),
      task({ id: "c", dueDate: "2026-10-30", done: true }),
      task({ id: "d", dueDate: "2026-11-03" }),
    ];

    expect(upcomingTasks(tasks, 2).map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("isOverdue", () => {
  it("is true only for open tasks before today", () => {
    expect(isOverdue({ done: false, dueDate: "2026-10-20" }, "2026-10-21")).toBe(true);
    expect(isOverdue({ done: false, dueDate: "2026-10-21" }, "2026-10-21")).toBe(false);
    expect(isOverdue({ done: true, dueDate: "2026-10-20" }, "2026-10-21")).toBe(false);
  });
});
