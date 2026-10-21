/** Jewelled category ramp for budget marks. Stable by category order. */
export const CATEGORY_COLORS = [
  "#6c3fb5",
  "#a779ed",
  "#e98b78",
  "#c9a24a",
  "#6fae8c",
  "#b2689f",
  "#7b7fd1",
  "#bf7b52",
] as const;

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
