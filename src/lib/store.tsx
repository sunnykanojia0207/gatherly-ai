"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { DEMO_EVENT_ID, createBudgetItems, createDemoSeed, emptyState, type DemoSeed } from "./seed";
import {
  eventInputSchema,
  taskInputSchema,
  vendorInputSchema,
  type AppState,
  type BudgetItem,
  type EventInput,
  type EventRecord,
  type GeneratedIdea,
  type TaskInput,
  type TaskRecord,
  type VendorInput,
  type VendorRecord,
} from "./schema";
import { loadState, saveState, type StorageNotice } from "./storage";
import { todayISO } from "./format";
import { aiIdeaKey, ideaBelongsToEvent } from "./ideas";
import type { AiAction } from "./labels";

type Action =
  | { type: "create-event"; event: EventRecord; budgetItems: BudgetItem[] }
  | { type: "demo"; seed: DemoSeed; reset: boolean }
  | { type: "select-event"; id: string }
  | { type: "delete-event"; id: string }
  | { type: "set-budget"; id: string; amount: number }
  | { type: "add-budget"; item: BudgetItem }
  | { type: "delete-budget"; id: string }
  | { type: "add-task"; task: TaskRecord }
  | { type: "update-task"; id: string; patch: Partial<TaskInput> & { done?: boolean } }
  | { type: "delete-task"; id: string }
  | { type: "add-vendor"; vendor: VendorRecord }
  | { type: "update-vendor"; id: string; patch: VendorInput }
  | { type: "delete-vendor"; id: string }
  | { type: "idea-save"; key: string }
  | { type: "idea-unsave"; key: string }
  | { type: "idea-dismiss"; key: string }
  | { type: "idea-restore"; key: string }
  | {
      type: "set-generated-ideas";
      eventId: string;
      aiAction: AiAction;
      ideas: GeneratedIdea[];
    };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "create-event":
      return {
        ...state,
        events: [...state.events, action.event],
        budgetItems: [...state.budgetItems, ...action.budgetItems],
        activeEventId: action.event.id,
      };
    case "demo": {
      const demoExists = state.events.some((event) => event.id === DEMO_EVENT_ID);
      if (demoExists && !action.reset) {
        return { ...state, activeEventId: DEMO_EVENT_ID };
      }
      const keep = <T extends { eventId: string }>(items: T[]) =>
        items.filter((item) => item.eventId !== DEMO_EVENT_ID);
      return {
        ...state,
        events: [...state.events.filter((event) => event.id !== DEMO_EVENT_ID), action.seed.event],
        budgetItems: [...keep(state.budgetItems), ...action.seed.budgetItems],
        tasks: [...keep(state.tasks), ...action.seed.tasks],
        vendors: [...keep(state.vendors), ...action.seed.vendors],
        savedIdeas: state.savedIdeas.filter((key) => !ideaBelongsToEvent(key, DEMO_EVENT_ID)),
        dismissedIdeas: state.dismissedIdeas.filter((key) =>
          !ideaBelongsToEvent(key, DEMO_EVENT_ID),
        ),
        generatedIdeas: state.generatedIdeas.filter(
          (idea) => idea.eventId !== DEMO_EVENT_ID,
        ),
        activeEventId: DEMO_EVENT_ID,
      };
    }
    case "select-event":
      return state.events.some((event) => event.id === action.id)
        ? { ...state, activeEventId: action.id }
        : state;
    case "delete-event": {
      if (!state.events.some((event) => event.id === action.id)) return state;
      const events = state.events.filter((event) => event.id !== action.id);
      return {
        ...state,
        events,
        activeEventId:
          state.activeEventId === action.id ? (events[0]?.id ?? null) : state.activeEventId,
        budgetItems: state.budgetItems.filter((item) => item.eventId !== action.id),
        tasks: state.tasks.filter((task) => task.eventId !== action.id),
        vendors: state.vendors.filter((vendor) => vendor.eventId !== action.id),
        savedIdeas: state.savedIdeas.filter((key) => !ideaBelongsToEvent(key, action.id)),
        dismissedIdeas: state.dismissedIdeas.filter((key) => !ideaBelongsToEvent(key, action.id)),
        generatedIdeas: state.generatedIdeas.filter((idea) => idea.eventId !== action.id),
      };
    }
    case "set-budget":
      return {
        ...state,
        budgetItems: state.budgetItems.map((item) =>
          item.id === action.id ? { ...item, amount: action.amount } : item,
        ),
      };
    case "add-budget":
      return { ...state, budgetItems: [...state.budgetItems, action.item] };
    case "delete-budget":
      return { ...state, budgetItems: state.budgetItems.filter((item) => item.id !== action.id) };
    case "add-task":
      return { ...state, tasks: [...state.tasks, action.task] };
    case "update-task":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, ...action.patch } : task,
        ),
      };
    case "delete-task":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };
    case "add-vendor":
      return { ...state, vendors: [...state.vendors, action.vendor] };
    case "update-vendor":
      return {
        ...state,
        vendors: state.vendors.map((vendor) =>
          vendor.id === action.id ? { ...vendor, ...action.patch } : vendor,
        ),
      };
    case "delete-vendor":
      return { ...state, vendors: state.vendors.filter((vendor) => vendor.id !== action.id) };
    case "idea-save":
      return {
        ...state,
        savedIdeas: state.savedIdeas.includes(action.key)
          ? state.savedIdeas
          : [...state.savedIdeas, action.key],
        dismissedIdeas: state.dismissedIdeas.filter((key) => key !== action.key),
      };
    case "idea-unsave":
      return { ...state, savedIdeas: state.savedIdeas.filter((key) => key !== action.key) };
    case "idea-dismiss":
      return {
        ...state,
        savedIdeas: state.savedIdeas.filter((key) => key !== action.key),
        dismissedIdeas: state.dismissedIdeas.includes(action.key)
          ? state.dismissedIdeas
          : [...state.dismissedIdeas, action.key],
      };
    case "idea-restore":
      return {
        ...state,
        dismissedIdeas: state.dismissedIdeas.filter((key) => key !== action.key),
      };
    case "set-generated-ideas": {
      const replaced = state.generatedIdeas.filter(
        (idea) => idea.eventId === action.eventId && idea.action === action.aiAction,
      );
      // Regenerating keeps cards the planner explicitly saved or set aside.
      const retained = replaced.filter((idea) => {
        const key = aiIdeaKey(idea.eventId, idea.id);
        return state.savedIdeas.includes(key) || state.dismissedIdeas.includes(key);
      });
      const kept = state.generatedIdeas.filter(
        (idea) => !(idea.eventId === action.eventId && idea.action === action.aiAction),
      );
      return {
        ...state,
        generatedIdeas: [...kept, ...retained, ...action.ideas].slice(-200),
      };
    }
    default:
      return state;
  }
}

interface StoreActions {
  createEvent: (input: EventInput) => EventRecord | null;
  loadDemo: () => void;
  resetDemo: () => void;
  selectEvent: (id: string) => void;
  deleteEvent: (id: string) => void;
  setBudgetAmount: (id: string, amount: number) => void;
  addBudgetItem: (name: string, amount: number) => boolean;
  deleteBudgetItem: (id: string) => void;
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, patch: Partial<TaskInput> & { done?: boolean }) => void;
  deleteTask: (id: string) => void;
  addVendor: (input: VendorInput) => void;
  updateVendor: (id: string, input: VendorInput) => void;
  deleteVendor: (id: string) => void;
  saveIdea: (key: string) => void;
  unsaveIdea: (key: string) => void;
  dismissIdea: (key: string) => void;
  restoreIdea: (key: string) => void;
  setGeneratedIdeas: (eventId: string, aiAction: AiAction, ideas: GeneratedIdea[]) => void;
}

interface Snapshot {
  state: AppState;
  ready: boolean;
  storageWarning: boolean;
  storageNotice: StorageNotice | null;
  recoveryBlocked: boolean;
}

const SERVER_SNAPSHOT: Snapshot = {
  state: emptyState(),
  ready: false,
  storageWarning: false,
  storageNotice: null,
  recoveryBlocked: false,
};

interface StoreValue extends Snapshot {
  activeEvent: EventRecord | null;
  actions: StoreActions;
}

function createStore() {
  let snapshot = SERVER_SNAPSHOT;
  let loaded = false;
  const listeners = new Set<() => void>();

  function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    const loadedState = loadState();
    snapshot = {
      state: loadedState.state ?? emptyState(),
      ready: true,
      storageWarning: false,
      storageNotice: loadedState.notice,
      recoveryBlocked: loadedState.blocked,
    };
  }

  function commit(next: AppState) {
    if (next === snapshot.state || snapshot.recoveryBlocked) return;
    snapshot = {
      ...snapshot,
      state: next,
      ready: true,
      storageWarning: !saveState(next),
    };
    for (const listener of listeners) listener();
  }

  function dispatch(action: Action) {
    ensureLoaded();
    commit(reducer(snapshot.state, action));
  }

  const actions: StoreActions = {
    createEvent(input) {
      const parsed = eventInputSchema.safeParse(input);
      if (!parsed.success) return null;
      const event: EventRecord = {
        ...parsed.data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "create-event", event, budgetItems: createBudgetItems(event.id) });
      return event;
    },
    loadDemo() {
      dispatch({ type: "demo", seed: createDemoSeed(todayISO()), reset: false });
    },
    resetDemo() {
      dispatch({ type: "demo", seed: createDemoSeed(todayISO()), reset: true });
    },
    selectEvent(id) {
      dispatch({ type: "select-event", id });
    },
    deleteEvent(id) {
      dispatch({ type: "delete-event", id });
    },
    setBudgetAmount(id, amount) {
      if (!Number.isFinite(amount)) return;
      dispatch({
        type: "set-budget",
        id,
        amount: Math.min(100_000_000, Math.max(0, Math.round(amount))),
      });
    },
    addBudgetItem(name, amount) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 60) return false;
      if (!Number.isFinite(amount) || amount < 0) return false;
      ensureLoaded();
      if (!snapshot.state.activeEventId) return false;
      dispatch({
        type: "add-budget",
        item: {
          id: crypto.randomUUID(),
          eventId: snapshot.state.activeEventId,
          name: trimmed,
          amount: Math.min(100_000_000, Math.round(amount)),
        },
      });
      return true;
    },
    deleteBudgetItem(id) {
      dispatch({ type: "delete-budget", id });
    },
    addTask(input) {
      const parsed = taskInputSchema.safeParse(input);
      if (!parsed.success) return;
      ensureLoaded();
      if (!snapshot.state.activeEventId) return;
      dispatch({
        type: "add-task",
        task: {
          ...parsed.data,
          id: crypto.randomUUID(),
          eventId: snapshot.state.activeEventId,
          done: false,
          createdAt: new Date().toISOString(),
        },
      });
    },
    updateTask(id, patch) {
      const parsed = taskInputSchema.partial().safeParse({
        title: patch.title,
        dueDate: patch.dueDate,
        priority: patch.priority,
      });
      if (!parsed.success) return;
      const safePatch: Partial<TaskInput> & { done?: boolean } = {};
      if (parsed.data.title !== undefined) safePatch.title = parsed.data.title;
      if (parsed.data.dueDate !== undefined) safePatch.dueDate = parsed.data.dueDate;
      if (parsed.data.priority !== undefined) safePatch.priority = parsed.data.priority;
      if (patch.done !== undefined) safePatch.done = patch.done;
      dispatch({ type: "update-task", id, patch: safePatch });
    },
    deleteTask(id) {
      dispatch({ type: "delete-task", id });
    },
    addVendor(input) {
      const parsed = vendorInputSchema.safeParse(input);
      if (!parsed.success) return;
      ensureLoaded();
      if (!snapshot.state.activeEventId) return;
      dispatch({
        type: "add-vendor",
        vendor: {
          ...parsed.data,
          id: crypto.randomUUID(),
          eventId: snapshot.state.activeEventId,
          createdAt: new Date().toISOString(),
        },
      });
    },
    updateVendor(id, input) {
      const parsed = vendorInputSchema.safeParse(input);
      if (!parsed.success) return;
      dispatch({ type: "update-vendor", id, patch: parsed.data });
    },
    deleteVendor(id) {
      dispatch({ type: "delete-vendor", id });
    },
    saveIdea(key) {
      dispatch({ type: "idea-save", key });
    },
    unsaveIdea(key) {
      dispatch({ type: "idea-unsave", key });
    },
    dismissIdea(key) {
      dispatch({ type: "idea-dismiss", key });
    },
    restoreIdea(key) {
      dispatch({ type: "idea-restore", key });
    },
    setGeneratedIdeas(eventId, aiAction, ideas) {
      dispatch({ type: "set-generated-ideas", eventId, aiAction, ideas });
    },
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      ensureLoaded();
      return snapshot;
    },
    getServerSnapshot() {
      return SERVER_SNAPSHOT;
    },
    actions,
  };
}

const GatherlyContext = createContext<StoreValue | null>(null);

export function GatherlyProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const activeEvent =
    snapshot.state.events.find((event) => event.id === snapshot.state.activeEventId) ?? null;

  return (
    <GatherlyContext.Provider value={{ ...snapshot, activeEvent, actions: store.actions }}>
      {children}
    </GatherlyContext.Provider>
  );
}

export function useGatherly(): StoreValue {
  const context = useContext(GatherlyContext);
  if (!context) {
    throw new Error("useGatherly must be used inside GatherlyProvider");
  }
  return context;
}
