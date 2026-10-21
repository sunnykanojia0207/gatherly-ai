import type { BudgetItem } from "./schema";

export interface BudgetSummary {
  planned: number;
  remaining: number;
  utilisation: number;
  overBudget: boolean;
}

export type BudgetHealth = "over" | "tight" | "healthy";

export function budgetSummary(
  items: ReadonlyArray<Pick<BudgetItem, "amount">>,
  totalBudget: number,
): BudgetSummary {
  const planned = items.reduce((total, item) => total + item.amount, 0);
  const remaining = totalBudget - planned;
  const utilisation = totalBudget > 0 ? planned / totalBudget : 0;

  return {
    planned,
    remaining,
    utilisation,
    overBudget: planned > totalBudget,
  };
}

/** Tight means at least 85% of the budget is already planned. */
export function budgetHealth(summary: BudgetSummary): BudgetHealth {
  if (summary.overBudget) return "over";
  if (summary.utilisation >= 0.85) return "tight";
  return "healthy";
}
