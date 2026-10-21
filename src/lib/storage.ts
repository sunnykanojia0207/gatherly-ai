import { appStateSchema, type AppState } from "./schema";

export const STORAGE_KEY = "gatherly.state.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadState(storage: StorageLike | null = defaultStorage()): AppState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = appStateSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;

    const state = parsed.data;
    if (state.activeEventId && !state.events.some((event) => event.id === state.activeEventId)) {
      state.activeEventId = state.events[0]?.id ?? null;
    }
    return state;
  } catch {
    return null;
  }
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
