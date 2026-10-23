import { describe, expect, it } from "vitest";

import type { AppState, EventRecord, GeneratedIdea, TaskRecord, VendorRecord } from "./schema";
import { createDemoSeed, emptyState } from "./seed";
import { BACKUP_KEY_PREFIX, STORAGE_KEY, loadState, saveState } from "./storage";

function event(id: string): EventRecord {
  return {
    id,
    name: `Event ${id}`,
    type: "wedding",
    date: "2026-12-16",
    location: "Mumbai",
    guests: 100,
    totalBudget: 100_000,
    theme: "",
    priorities: [],
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function task(id: string, eventId: string): TaskRecord {
  return {
    id,
    eventId,
    title: `Task ${id}`,
    dueDate: "2026-11-01",
    priority: "medium",
    done: false,
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function vendor(id: string, eventId: string): VendorRecord {
  return {
    id,
    eventId,
    name: `Vendor ${id}`,
    category: "Catering",
    contact: "",
    estimatedCost: 10_000,
    quotedCost: 9_000,
    status: "contacted",
    followUpDate: "",
    notes: "",
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function generatedIdea(id: string, eventId: string): GeneratedIdea {
  return {
    id,
    eventId,
    action: "themes",
    section: "themes",
    title: `Idea ${id}`,
    detail: "Detail",
    why: "",
    impact: "",
    priority: "medium",
    costMin: null,
    costMax: null,
    costNote: "",
    nextStep: "",
    model: "gemini-3.8-flash",
    generatedAt: "2026-10-01T00:00:00.000Z",
  };
}

function populated(overrides: Partial<AppState> = {}): AppState {
  return {
    ...emptyState(),
    events: [event("event-1"), event("event-2")],
    activeEventId: "event-1",
    ...overrides,
  };
}

function storageWith(raw: string | null, options: { failWrites?: boolean } = {}) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(STORAGE_KEY, raw);
  let writes = 0;

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, next: string) {
      if (options.failWrites) throw new Error("quota exceeded");
      writes += 1;
      values.set(key, next);
    },
    read() {
      return values.get(STORAGE_KEY) ?? null;
    },
    readKey(key: string) {
      return values.get(key) ?? null;
    },
    setRaw(next: string) {
      values.set(STORAGE_KEY, next);
    },
    writes() {
      return writes;
    },
    backupKeys() {
      return [...values.keys()].filter((key) => key.startsWith(BACKUP_KEY_PREFIX));
    },
  };
}

function noticeOf(result: ReturnType<typeof loadState>) {
  if (!result.notice || result.notice.kind !== "recovered") {
    throw new Error(`Expected a recovery notice, got ${result.notice?.kind ?? "none"}`);
  }
  return result.notice;
}

describe("loadState", () => {
  it("returns no state and no notice for missing storage or missing saved state", () => {
    expect(loadState(null)).toMatchObject({ state: null, notice: null, blocked: false });
    expect(loadState(storageWith(null))).toMatchObject({
      state: null,
      notice: null,
      blocked: false,
    });
  });

  it("reports unavailable storage without blocking session-only use", () => {
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };

    expect(loadState(blocked)).toMatchObject({
      state: null,
      notice: { kind: "unavailable" },
      blocked: false,
    });
  });

  it("keeps a fully valid state unchanged without creating a backup", () => {
    const state = populated();
    const storage = storageWith(JSON.stringify(state));
    const loaded = loadState(storage);

    expect(loaded).toMatchObject({ state, notice: null, blocked: false });
    expect(storage.writes()).toBe(0);
    expect(storage.backupKeys()).toEqual([]);
  });

  it("loads demo-shaped data and legacy data with omitted optional collections", () => {
    const seed = createDemoSeed("2026-10-21");
    const demoState: AppState = {
      ...emptyState(),
      events: [seed.event],
      activeEventId: seed.event.id,
      budgetItems: seed.budgetItems,
      tasks: seed.tasks,
      vendors: seed.vendors,
    };

    expect(loadState(storageWith(JSON.stringify(demoState)))).toMatchObject({
      state: demoState,
      notice: null,
      blocked: false,
    });

    const legacy = {
      version: 1,
      events: [event("event-1")],
      activeEventId: "event-1",
      budgetItems: [],
      tasks: [],
      vendors: [],
    };
    const loaded = loadState(storageWith(JSON.stringify(legacy)));

    expect(loaded.notice).toBeNull();
    expect(loaded.state).toEqual({
      ...emptyState(),
      events: [event("event-1")],
      activeEventId: "event-1",
    });
  });

  it("salvages valid records when another record is malformed", () => {
    const rawState = {
      ...populated(),
      budgetItems: [
        { id: "budget-1", eventId: "event-1", name: "Catering", amount: 10_000 },
        { id: "budget-2", eventId: "event-1", name: "Broken", amount: "lots" },
        { id: "budget-3", eventId: "event-1", name: "Decor", amount: 5_000 },
      ],
      tasks: [task("task-1", "event-1")],
      vendors: [vendor("vendor-1", "event-1")],
    };
    const storage = storageWith(JSON.stringify(rawState));
    const loaded = loadState(storage);

    expect(loaded.blocked).toBe(false);
    expect(loaded.state?.events.map((item) => item.id)).toEqual(["event-1", "event-2"]);
    expect(loaded.state?.budgetItems.map((item) => item.id)).toEqual(["budget-1", "budget-3"]);
    expect(loaded.state?.tasks.map((item) => item.id)).toEqual(["task-1"]);
    expect(loaded.state?.vendors.map((item) => item.id)).toEqual(["vendor-1"]);
    expect(noticeOf(loaded)).toMatchObject({
      recovered: { events: 2, budgetItems: 2, tasks: 1, vendors: 1 },
      dropped: { events: 0, budgetItems: 1, tasks: 0, vendors: 0 },
    });
    expect(storage.readKey(noticeOf(loaded).backupKey)).toBe(JSON.stringify(rawState));
  });

  it("drops multiple malformed records and records orphaned by a dropped event", () => {
    const rawState = {
      ...populated(),
      events: [event("event-1"), { ...event("event-2"), guests: "many" }],
      activeEventId: "event-1",
      budgetItems: [
        { id: "budget-1", eventId: "event-1", name: "Catering", amount: 10_000 },
        { id: "budget-2", eventId: "event-2", name: "Orphaned event budget", amount: 5_000 },
      ],
      tasks: [task("task-1", "event-1"), { ...task("task-2", "event-1"), title: "" }],
      vendors: [vendor("vendor-1", "event-1"), { ...vendor("vendor-2", "event-1"), status: "unknown" }],
    };
    const loaded = loadState(storageWith(JSON.stringify(rawState)));

    expect(loaded.state?.events.map((item) => item.id)).toEqual(["event-1"]);
    expect(loaded.state?.budgetItems.map((item) => item.id)).toEqual(["budget-1"]);
    expect(loaded.state?.tasks.map((item) => item.id)).toEqual(["task-1"]);
    expect(loaded.state?.vendors.map((item) => item.id)).toEqual(["vendor-1"]);
    expect(noticeOf(loaded)).toMatchObject({
      dropped: { events: 1, budgetItems: 1, tasks: 1, vendors: 1 },
    });
  });

  it("removes orphaned references only after the event set is validated", () => {
    const state = populated({
      budgetItems: [
        { id: "budget-1", eventId: "event-1", name: "Catering", amount: 10_000 },
        { id: "budget-2", eventId: "missing", name: "Orphan", amount: 5_000 },
      ],
      tasks: [task("task-1", "event-1"), task("task-2", "missing")],
      vendors: [vendor("vendor-1", "event-1"), vendor("vendor-2", "missing")],
      generatedIdeas: [generatedIdea("idea-1", "event-1"), generatedIdea("idea-2", "missing")],
      savedIdeas: ["event-1|themes|Keep", "missing|themes|Drop"],
      dismissedIdeas: ["event-2|themes|Keep", "missing|themes|Drop"],
    });
    const loaded = loadState(storageWith(JSON.stringify(state)));

    expect(loaded.state?.budgetItems.map((item) => item.id)).toEqual(["budget-1"]);
    expect(loaded.state?.tasks.map((item) => item.id)).toEqual(["task-1"]);
    expect(loaded.state?.vendors.map((item) => item.id)).toEqual(["vendor-1"]);
    expect(loaded.state?.generatedIdeas.map((item) => item.id)).toEqual(["idea-1"]);
    expect(loaded.state?.savedIdeas).toEqual(["event-1|themes|Keep"]);
    expect(loaded.state?.dismissedIdeas).toEqual(["event-2|themes|Keep"]);
    expect(noticeOf(loaded)).toMatchObject({
      dropped: {
        budgetItems: 1,
        tasks: 1,
        vendors: 1,
        generatedIdeas: 1,
        savedIdeas: 1,
        dismissedIdeas: 1,
      },
    });
  });

  it("repairs invalid active-event references safely", () => {
    const withMissing = loadState(
      storageWith(JSON.stringify(populated({ activeEventId: "missing" }))),
    );
    expect(withMissing.state?.activeEventId).toBe("event-1");
    expect(noticeOf(withMissing).recovered.events).toBe(2);

    const withoutEvents = loadState(
      storageWith(
        JSON.stringify(
          populated({ events: [], activeEventId: "missing", budgetItems: [], tasks: [], vendors: [] }),
        ),
      ),
    );
    expect(withoutEvents.state?.activeEventId).toBeNull();
    expect(noticeOf(withoutEvents).recovered.events).toBe(0);
  });

  it("backs up malformed JSON, preserves the raw value, and starts with empty state", () => {
    const raw = '{not json "secret": "not-shown"';
    const storage = storageWith(raw);
    const loaded = loadState(storage);
    const notice = noticeOf(loaded);

    expect(loaded.state).toEqual(emptyState());
    expect(loaded.blocked).toBe(false);
    expect(notice.recovered.events).toBe(0);
    expect(notice.dropped.events).toBe(0);
    expect(storage.read()).toBe(raw);
    expect(storage.readKey(notice.backupKey)).toBe(raw);
    expect(JSON.stringify(notice)).not.toContain("not-shown");
  });

  it("blocks repair instead of overwriting a backup that cannot be written", () => {
    const raw = JSON.stringify({ version: 1, events: "broken" });
    const storage = storageWith(raw, { failWrites: true });
    const loaded = loadState(storage);

    expect(loaded).toMatchObject({
      state: null,
      blocked: true,
      notice: { kind: "backup-failed" },
    });
    expect(storage.read()).toBe(raw);
    expect(storage.writes()).toBe(0);
  });

  it("leaves unsupported future versions untouched and blocks writes", () => {
    const raw = JSON.stringify({ version: 2, events: [], activeEventId: null });
    const storage = storageWith(raw);
    const loaded = loadState(storage);

    expect(loaded).toMatchObject({
      state: null,
      blocked: true,
      notice: { kind: "future-version", version: 2 },
    });
    expect(storage.read()).toBe(raw);
    expect(storage.writes()).toBe(0);
  });

  it("does not create a second backup on repeated initialization", () => {
    const raw = JSON.stringify({ version: 1, events: "broken" });
    const storage = storageWith(raw);
    const first = loadState(storage);
    const writesAfterFirst = storage.writes();
    const second = loadState(storage);

    expect(second.state).toEqual(first.state);
    expect(second.notice).toEqual(first.notice);
    expect(second.blocked).toBe(first.blocked);
    expect(storage.writes()).toBe(writesAfterFirst);
    expect(storage.backupKeys()).toHaveLength(1);
    expect(storage.read()).toBe(raw);
  });

  it("produces a state that can be saved after recovery without repeating repair", () => {
    const raw = JSON.stringify({
      ...populated(),
      generatedIdeas: Array.from({ length: 201 }, (_, index) =>
        generatedIdea(`idea-${index}`, "event-1"),
      ),
    });
    const storage = storageWith(raw);
    const first = loadState(storage);
    const recovered = noticeOf(first);

    expect(first.state?.generatedIdeas).toHaveLength(200);
    expect(recovered.dropped.generatedIdeas).toBe(1);
    expect(saveState(first.state!, storage)).toBe(true);
    expect(loadState(storage).notice).toBeNull();
  });

  it("preserves an earlier backup when a different corrupt value is recovered later", () => {
    const firstRaw = JSON.stringify({ version: 1, events: "first corruption" });
    const secondRaw = JSON.stringify({ version: 1, events: "second corruption" });
    const storage = storageWith(firstRaw);
    const first = loadState(storage);
    const firstBackup = noticeOf(first).backupKey;
    const firstBackupValue = storage.readKey(firstBackup);

    storage.setRaw(secondRaw);
    const second = loadState(storage);
    const secondBackup = noticeOf(second).backupKey;

    expect(secondBackup).not.toBe(firstBackup);
    expect(storage.readKey(firstBackup)).toBe(firstBackupValue);
    expect(storage.readKey(secondBackup)).toBe(secondRaw);
  });

  it("keeps the original raw value when recovery is required", () => {
    const raw = JSON.stringify({ ...populated(), activeEventId: "missing" });
    const storage = storageWith(raw);

    loadState(storage);

    expect(storage.read()).toBe(raw);
  });
});

describe("saveState", () => {
  it("writes the exact validated shape and reports success", () => {
    const storage = storageWith(null);
    const state = populated();

    expect(saveState(state, storage)).toBe(true);
    expect(JSON.parse(storage.read() ?? "")).toEqual(state);
  });

  it("returns false when storage is missing or throws", () => {
    const blocked = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("quota exceeded");
      },
    };

    expect(saveState(populated(), null)).toBe(false);
    expect(saveState(populated(), blocked)).toBe(false);
  });
});
