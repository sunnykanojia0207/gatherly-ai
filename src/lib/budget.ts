import type { BudgetItem, VendorRecord } from "./schema";

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

const CATEGORY_STOP_WORDS = new Set(["and", "the", "for", "with", "extra", "extras"]);

function searchable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function categoryWords(value: string): string[] {
  return searchable(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3 && !CATEGORY_STOP_WORDS.has(word));
}

/** Loose category matching, with accents folded so "Décor" matches "Decor". */
export function categoryMatches(vendorCategory: string, itemName: string): boolean {
  const vendorWords = categoryWords(vendorCategory);
  const itemWords = categoryWords(itemName);
  const normalizedCategory = searchable(vendorCategory);
  const normalizedItem = searchable(itemName);

  return (
    vendorWords.some((word) => normalizedItem.includes(word)) ||
    itemWords.some((word) => normalizedCategory.includes(word))
  );
}

/** Lowest positive quote among active vendors whose category loosely matches the item. */
export function findLowestQuote(
  vendors: ReadonlyArray<VendorRecord>,
  itemName: string,
): VendorRecord | null {
  return (
    vendors
      .filter(
        (vendor) =>
          vendor.status !== "declined" &&
          vendor.quotedCost > 0 &&
          categoryMatches(vendor.category, itemName),
      )
      .sort((a, b) => a.quotedCost - b.quotedCost)[0] ?? null
  );
}
