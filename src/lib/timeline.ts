import type { TaskRecord } from "./schema";

export interface TaskProgress {
  total: number;
  done: number;
  percent: number;
}

export function taskProgress(tasks: ReadonlyArray<Pick<TaskRecord, "done">>): TaskProgress {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Open tasks first, each group sorted by due date. */
export function orderTasks(tasks: readonly TaskRecord[]): TaskRecord[] {
  return [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate),
  );
}

export function upcomingTasks(tasks: readonly TaskRecord[], limit = 5): TaskRecord[] {
  return tasks
    .filter((task) => !task.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

export function isOverdue(
  task: Pick<TaskRecord, "done" | "dueDate">,
  today: string,
): boolean {
  return !task.done && task.dueDate < today;
}
