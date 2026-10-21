import { budgetHealth, budgetSummary } from "./budget";
import { addDays, daysUntil, formatDateShort, formatINR } from "./format";
import { TASK_PRIORITY_LABELS, VENDOR_STATUS_LABELS } from "./labels";
import type { BudgetItem, EventRecord, TaskRecord, VendorRecord } from "./schema";
import { upcomingTasks } from "./timeline";

export type InsightTone = "danger" | "warning" | "accent" | "positive";

export interface Insight {
  id: string;
  kicker: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: InsightTone;
}

export interface InsightInput {
  event: EventRecord;
  budgetItems: ReadonlyArray<BudgetItem>;
  tasks: ReadonlyArray<TaskRecord>;
  vendors: ReadonlyArray<VendorRecord>;
  today: string;
}

/**
 * "Your next moves" — derived only from saved state. No invented activity,
 * no claims that a vendor was contacted.
 */
export function buildNextMoves({
  event,
  budgetItems,
  tasks,
  vendors,
  today,
}: InsightInput): Insight[] {
  const summary = budgetSummary(budgetItems, event.totalBudget);
  const health = budgetHealth(summary);
  const moves: Insight[] = [];

  const overdue = tasks
    .filter((task) => !task.done && task.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (overdue.length > 0) {
    const first = overdue[0];
    moves.push({
      id: "overdue",
      kicker: "Overdue",
      title:
        overdue.length === 1
          ? `“${first.title}” is past its date`
          : `${overdue.length} tasks are past their dates`,
      detail:
        overdue.length === 1
          ? `Was due ${formatDateShort(first.dueDate)} · ${TASK_PRIORITY_LABELS[first.priority]} priority`
          : `Oldest: ${first.title}, due ${formatDateShort(first.dueDate)}`,
      href: "/timeline",
      cta: "Review timeline",
      tone: "danger",
    });
  }

  if (summary.overBudget) {
    moves.push({
      id: "over-budget",
      kicker: "Budget",
      title: `Trim ${formatINR(-summary.remaining)} from the plan`,
      detail: `${formatINR(summary.planned)} is planned against a ${formatINR(event.totalBudget)} total.`,
      href: "/budget",
      cta: "Open budget",
      tone: "danger",
    });
  }

  const followUpWindow = addDays(today, 7);
  const followUp = vendors
    .filter(
      (vendor) =>
        vendor.status !== "declined" &&
        vendor.followUpDate !== "" &&
        vendor.followUpDate <= followUpWindow,
    )
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))[0];
  if (followUp) {
    const late = followUp.followUpDate < today;
    moves.push({
      id: `follow-up-${followUp.id}`,
      kicker: "Vendors",
      title: `Follow up with ${followUp.name}`,
      detail: `${VENDOR_STATUS_LABELS[followUp.status]} · ${late ? "was due" : "due"} ${formatDateShort(followUp.followUpDate)}`,
      href: "/vendors",
      cta: "Open vendors",
      tone: late ? "warning" : "accent",
    });
  }

  if (summary.planned === 0 && budgetItems.length > 0) {
    moves.push({
      id: "budget-empty",
      kicker: "Budget",
      title: "Give every category a number",
      detail: `${formatINR(event.totalBudget)} is available across ${budgetItems.length} categories.`,
      href: "/budget",
      cta: "Start allocating",
      tone: "accent",
    });
  } else if (summary.remaining === 0 && !summary.overBudget) {
    moves.push({
      id: "budget-full",
      kicker: "Budget",
      title: "Every rupee is allocated",
      detail: "Hold a small buffer before confirming the next booking.",
      href: "/budget",
      cta: "Review the plan",
      tone: "warning",
    });
  } else if (health === "tight") {
    moves.push({
      id: "budget-tight",
      kicker: "Budget buffer",
      title: `Protect the last ${formatINR(summary.remaining)}`,
      detail: `${Math.round(summary.utilisation * 100)}% of the budget is already planned.`,
      href: "/budget",
      cta: "Review categories",
      tone: "warning",
    });
  } else if (summary.remaining > event.totalBudget * 0.25) {
    moves.push({
      id: "budget-remaining",
      kicker: "Budget",
      title: `Give ${formatINR(summary.remaining)} a job`,
      detail: "Still unallocated — put it against the categories that matter most.",
      href: "/budget",
      cta: "Allocate budget",
      tone: "accent",
    });
  }

  const [next] = upcomingTasks(tasks, 1);
  if (next && daysUntil(next.dueDate, today) <= 14) {
    const due = daysUntil(next.dueDate, today);
    moves.push({
      id: `milestone-${next.id}`,
      kicker: "Next milestone",
      title: `Prepare for “${next.title}”`,
      detail:
        due === 0
          ? `Due today · ${TASK_PRIORITY_LABELS[next.priority]} priority`
          : `Due ${formatDateShort(next.dueDate)} · ${TASK_PRIORITY_LABELS[next.priority]} priority`,
      href: "/timeline",
      cta: "Open timeline",
      tone: "accent",
    });
  }

  if (tasks.length === 0) {
    moves.push({
      id: "no-tasks",
      kicker: "Timeline",
      title: "Build the first timeline",
      detail: "One decision on the calendar is enough to start.",
      href: "/timeline",
      cta: "Add a task",
      tone: "accent",
    });
  }

  if (vendors.length === 0) {
    moves.push({
      id: "no-vendors",
      kicker: "Vendors",
      title: "Start the vendor shortlist",
      detail: "Track quotes and follow-ups in one place — nothing is contacted for you.",
      href: "/vendors",
      cta: "Add a vendor",
      tone: "accent",
    });
  }

  if (moves.length === 0) {
    moves.push({
      id: "steady",
      kicker: "On track",
      title: "No urgent moves today",
      detail: "The budget, timeline, and vendor list are steady. Add the next task when it matters.",
      href: "/timeline",
      cta: "Open timeline",
      tone: "positive",
    });
  }

  return moves.slice(0, 3);
}
