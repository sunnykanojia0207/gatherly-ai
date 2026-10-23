import { ideaBelongsToEvent } from "./ideas";
import {
  appStateSchema,
  budgetItemSchema,
  eventRecordSchema,
  generatedIdeaSchema,
  taskRecordSchema,
  vendorRecordSchema,
  type AppState,
} from "./schema";
import { emptyState } from "./seed";

export const STORAGE_KEY = "gatherly.state.v1";
export const BACKUP_KEY_PREFIX = `${STORAGE_KEY}.backup.`;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface RecoveryCounts {
  events: number;
  budgetItems: number;
  tasks: number;
  vendors: number;
  savedIdeas: number;
  dismissedIdeas: number;
  generatedIdeas: number;
}

export type StorageNotice =
  | {
      kind: "recovered";
      backupKey: string;
      recovered: RecoveryCounts;
      dropped: RecoveryCounts;
    }
  | { kind: "future-version"; version: number }
  | { kind: "backup-failed" }
  | { kind: "unavailable" };

export interface LoadStateResult {
  state: AppState | null;
  notice: StorageNotice | null;
  /** True when writing could destroy data that could not be preserved. */
  blocked: boolean;
}

interface SafeParser<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false };
}

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyCounts(): RecoveryCounts {
  return {
    events: 0,
    budgetItems: 0,
    tasks: 0,
    vendors: 0,
    savedIdeas: 0,
    dismissedIdeas: 0,
    generatedIdeas: 0,
  };
}

function countsOf(state: AppState): RecoveryCounts {
  return {
    events: state.events.length,
    budgetItems: state.budgetItems.length,
    tasks: state.tasks.length,
    vendors: state.vendors.length,
    savedIdeas: state.savedIdeas.length,
    dismissedIdeas: state.dismissedIdeas.length,
    generatedIdeas: state.generatedIdeas.length,
  };
}

function droppedCounts(before: RecoveryCounts, after: RecoveryCounts): RecoveryCounts {
  return {
    events: Math.max(0, before.events - after.events),
    budgetItems: Math.max(0, before.budgetItems - after.budgetItems),
    tasks: Math.max(0, before.tasks - after.tasks),
    vendors: Math.max(0, before.vendors - after.vendors),
    savedIdeas: Math.max(0, before.savedIdeas - after.savedIdeas),
    dismissedIdeas: Math.max(0, before.dismissedIdeas - after.dismissedIdeas),
    generatedIdeas: Math.max(0, before.generatedIdeas - after.generatedIdeas),
  };
}

/** Keep cross-record references valid after manual edits or a partial recovery. */
function repairState(state: AppState): { state: AppState; changed: boolean } {
  const eventIds = new Set(state.events.map((event) => event.id));
  const belongsToSavedEvent = (key: string) =>
    state.events.some((event) => ideaBelongsToEvent(key, event.id));

  const activeEventId =
    state.activeEventId && eventIds.has(state.activeEventId)
      ? state.activeEventId
      : (state.events[0]?.id ?? null);
  const budgetItems = state.budgetItems.filter((item) => eventIds.has(item.eventId));
  const tasks = state.tasks.filter((task) => eventIds.has(task.eventId));
  const vendors = state.vendors.filter((vendor) => eventIds.has(vendor.eventId));
  const savedIdeas = state.savedIdeas.filter(belongsToSavedEvent);
  const dismissedIdeas = state.dismissedIdeas.filter(belongsToSavedEvent);
  const generatedIdeas = state.generatedIdeas.filter((idea) => eventIds.has(idea.eventId));

  const changed =
    activeEventId !== state.activeEventId ||
    budgetItems.length !== state.budgetItems.length ||
    tasks.length !== state.tasks.length ||
    vendors.length !== state.vendors.length ||
    savedIdeas.length !== state.savedIdeas.length ||
    dismissedIdeas.length !== state.dismissedIdeas.length ||
    generatedIdeas.length !== state.generatedIdeas.length;

  return {
    state: {
      ...state,
      activeEventId,
      budgetItems,
      tasks,
      vendors,
      savedIdeas,
      dismissedIdeas,
      generatedIdeas,
    },
    changed,
  };
}

function parseRecords<T>(
  value: unknown,
  schema: SafeParser<T>,
): { items: T[]; received: number } {
  if (!Array.isArray(value)) return { items: [], received: 0 };

  const items: T[] = [];
  for (const entry of value) {
    const parsed = schema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
  }
  return { items, received: value.length };
}

function parseIdeaKeys(
  value: unknown,
  eventIds: Set<string>,
): { items: string[]; received: number } {
  if (!Array.isArray(value)) return { items: [], received: 0 };

  const items = value.filter(
    (key): key is string =>
      typeof key === "string" &&
      [...eventIds].some((eventId) => ideaBelongsToEvent(key, eventId)),
  );
  return { items, received: value.length };
}

/**
 * Validate each record and each relationship independently. A malformed record
 * is left out, but it cannot discard the valid records around it.
 */
function salvageState(value: unknown): { state: AppState; dropped: RecoveryCounts } {
  const source = isRecord(value) ? value : {};
  const events = parseRecords(source.events, eventRecordSchema);
  const eventIds = new Set(events.items.map((event) => event.id));

  const budget = parseRecords(source.budgetItems, budgetItemSchema);
  const tasks = parseRecords(source.tasks, taskRecordSchema);
  const vendors = parseRecords(source.vendors, vendorRecordSchema);
  const generated = parseRecords(source.generatedIdeas, generatedIdeaSchema);
  const saved = parseIdeaKeys(source.savedIdeas, eventIds);
  const dismissed = parseIdeaKeys(source.dismissedIdeas, eventIds);

  const budgetItems = budget.items.filter((item) => eventIds.has(item.eventId));
  const taskItems = tasks.items.filter((task) => eventIds.has(task.eventId));
  const vendorItems = vendors.items.filter((vendor) => eventIds.has(vendor.eventId));
  // Keep the recovered state within the persisted schema's bound so the next
  // save does not trigger the same repair again.
  const generatedIdeas = generated.items
    .filter((idea) => eventIds.has(idea.eventId))
    .slice(-200);

  const state: AppState = {
    version: 1,
    events: events.items,
    activeEventId:
      typeof source.activeEventId === "string" && eventIds.has(source.activeEventId)
        ? source.activeEventId
        : (events.items[0]?.id ?? null),
    budgetItems,
    tasks: taskItems,
    vendors: vendorItems,
    savedIdeas: saved.items,
    dismissedIdeas: dismissed.items,
    generatedIdeas,
  };

  return {
    state,
    dropped: {
      events: events.received - events.items.length,
      budgetItems: budget.received - budgetItems.length,
      tasks: tasks.received - taskItems.length,
      vendors: vendors.received - vendorItems.length,
      savedIdeas: saved.received - saved.items.length,
      dismissedIdeas: dismissed.received - dismissed.items.length,
      generatedIdeas: generated.received - generatedIdeas.length,
    },
  };
}

function futureVersion(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const raw = value.version;
  const version =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;

  return Number.isFinite(version) && version > 1 ? version : null;
}

/** Stable enough to find an existing copy; collisions fall through to the next slot. */
function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${value.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/**
 * Never overwrites a backup: identical raw values reuse their existing copy,
 * while a hash collision gets the next deterministic slot.
 */
function backupRaw(storage: StorageLike, raw: string): string | null {
  const base = `${BACKUP_KEY_PREFIX}${fingerprint(raw)}`;

  for (let slot = 0; slot < 20; slot += 1) {
    const key = slot === 0 ? base : `${base}.${slot}`;
    try {
      const existing = storage.getItem(key);
      if (existing === raw) return key;
      if (existing === null) {
        storage.setItem(key, raw);
        return key;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function recover(
  storage: StorageLike,
  raw: string,
  state: AppState,
  dropped: RecoveryCounts,
): LoadStateResult {
  const backupKey = backupRaw(storage, raw);
  if (!backupKey) {
    return { state: null, notice: { kind: "backup-failed" }, blocked: true };
  }
  return {
    state,
    notice: {
      kind: "recovered",
      backupKey,
      recovered: countsOf(state),
      dropped,
    },
    blocked: false,
  };
}

export function loadState(storage?: StorageLike | null): LoadStateResult {
  const store = storage === undefined ? defaultStorage() : storage;
  if (!store) {
    return {
      state: null,
      // A missing store during SSR is expected; in a browser it means the
      // storage API itself was blocked, which must be visible to the user.
      notice:
        storage === undefined && typeof window !== "undefined"
          ? { kind: "unavailable" }
          : null,
      blocked: false,
    };
  }

  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { state: null, notice: { kind: "unavailable" }, blocked: false };
  }
  if (!raw) return { state: null, notice: null, blocked: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return recover(store, raw, emptyState(), emptyCounts());
  }

  const version = futureVersion(parsed);
  if (version !== null) {
    return { state: null, notice: { kind: "future-version", version }, blocked: true };
  }

  const valid = appStateSchema.safeParse(parsed);
  if (valid.success) {
    const repaired = repairState(valid.data);
    if (!repaired.changed) {
      return { state: repaired.state, notice: null, blocked: false };
    }
    return recover(
      store,
      raw,
      repaired.state,
      droppedCounts(countsOf(valid.data), countsOf(repaired.state)),
    );
  }

  const salvaged = salvageState(parsed);
  return recover(store, raw, salvaged.state, salvaged.dropped);
}

export function saveState(
  state: AppState,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
