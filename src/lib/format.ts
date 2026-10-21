export const CURRENCY_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const DAY_MS = 86_400_000;

export function formatINR(amount: number): string {
  return CURRENCY_FORMAT.format(amount);
}

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(dateISO: string, days: number): string {
  const parsed = new Date(`${dateISO}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Whole days between two date-only strings. Negative means the date is past. */
export function daysUntil(dateISO: string, fromISO: string): number {
  return Math.round(
    (Date.parse(`${dateISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / DAY_MS,
  );
}

export function formatDate(dateISO: string): string {
  return DATE_FORMAT.format(new Date(`${dateISO}T00:00:00Z`));
}

export function formatDateShort(dateISO: string): string {
  return SHORT_DATE_FORMAT.format(new Date(`${dateISO}T00:00:00Z`));
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `In ${days} days`;
}
