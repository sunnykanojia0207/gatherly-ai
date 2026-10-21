import { addDays } from "./format";
import type {
  AppState,
  BudgetItem,
  EventRecord,
  TaskRecord,
  VendorRecord,
} from "./schema";

export const DEMO_EVENT_ID = "event-demo";

export const BUDGET_CATEGORY_NAMES = [
  "Venue & decor",
  "Catering",
  "Photography",
  "Attire",
  "Entertainment",
  "Invitations",
  "Transport & contingency",
] as const;

/** The demo budget must always add up to ₹4,50,000. */
export const DEMO_BUDGET_AMOUNTS = [150_000, 144_000, 55_000, 45_000, 30_000, 8_000, 18_000] as const;
export const DEMO_TOTAL_BUDGET = 450_000;

export interface DemoSeed {
  event: EventRecord;
  budgetItems: BudgetItem[];
  tasks: TaskRecord[];
  vendors: VendorRecord[];
}

export function emptyState(): AppState {
  return {
    version: 1,
    events: [],
    activeEventId: null,
    budgetItems: [],
    tasks: [],
    vendors: [],
    savedIdeas: [],
    dismissedIdeas: [],
    generatedIdeas: [],
  };
}

export function createBudgetItems(eventId: string): BudgetItem[] {
  return BUDGET_CATEGORY_NAMES.map((name) => ({
    id: crypto.randomUUID(),
    eventId,
    name,
    amount: 0,
  }));
}

export function createDemoSeed(today: string): DemoSeed {
  const createdAt = new Date().toISOString();
  const event: EventRecord = {
    id: DEMO_EVENT_ID,
    name: "Meera & Arjun's Wedding",
    type: "wedding",
    date: addDays(today, 56),
    location: "Mumbai, India",
    guests: 120,
    totalBudget: DEMO_TOTAL_BUDGET,
    theme: "Warm ivory, marigold, and candid moments",
    priorities: ["food", "photography", "music", "guests"],
    createdAt,
  };

  const budgetItems: BudgetItem[] = BUDGET_CATEGORY_NAMES.map((name, index) => ({
    id: `demo-budget-${index + 1}`,
    eventId: DEMO_EVENT_ID,
    name,
    amount: DEMO_BUDGET_AMOUNTS[index],
  }));

  const taskSeeds: Array<Pick<TaskRecord, "title" | "dueDate" | "priority" | "done">> = [
    { title: "Book the venue", dueDate: addDays(today, -28), priority: "high", done: true },
    { title: "Finalise the guest list", dueDate: addDays(today, -21), priority: "high", done: true },
    { title: "Send save-the-dates", dueDate: addDays(today, -14), priority: "medium", done: true },
    { title: "Book the catering tasting", dueDate: addDays(today, 3), priority: "high", done: false },
    { title: "Confirm the photographer", dueDate: addDays(today, 7), priority: "high", done: false },
    { title: "Order invitations", dueDate: addDays(today, 10), priority: "medium", done: false },
    { title: "Book the mehendi artist", dueDate: addDays(today, 17), priority: "low", done: false },
    { title: "Plan the sangeet playlist", dueDate: addDays(today, 24), priority: "medium", done: false },
    { title: "Finalise outfit fittings", dueDate: addDays(today, 31), priority: "medium", done: false },
    { title: "Confirm guest transport", dueDate: addDays(today, 40), priority: "low", done: false },
    { title: "Share the final run sheet with vendors", dueDate: addDays(today, 52), priority: "high", done: false },
  ];

  const tasks: TaskRecord[] = taskSeeds.map((task, index) => ({
    ...task,
    id: `demo-task-${index + 1}`,
    eventId: DEMO_EVENT_ID,
    createdAt,
  }));

  const vendorSeeds: Array<Omit<VendorRecord, "id" | "eventId" | "createdAt">> = [
    {
      name: "The Leela Mumbai",
      category: "Venue",
      contact: "events@theleela.example",
      estimatedCost: 160_000,
      quotedCost: 150_000,
      status: "booked",
      followUpDate: addDays(today, 5),
      notes: "Courtyard lawn confirmed. Ask for the rain backup plan.",
    },
    {
      name: "Spice Route Catering",
      category: "Catering",
      contact: "+91 90000 00002",
      estimatedCost: 144_000,
      quotedCost: 144_000,
      status: "booked",
      followUpDate: addDays(today, 9),
      notes: "Vegetarian tasting menu locked. Final headcount due two weeks before.",
    },
    {
      name: "Frame & Light Studio",
      category: "Photography",
      contact: "hello@framelight.example",
      estimatedCost: 55_000,
      quotedCost: 60_000,
      status: "contacted",
      followUpDate: addDays(today, 2),
      notes: "Waiting on the second-shooter quote.",
    },
    {
      name: "DJ Aria",
      category: "Entertainment",
      contact: "+91 90000 00004",
      estimatedCost: 30_000,
      quotedCost: 35_000,
      status: "considering",
      followUpDate: addDays(today, 6),
      notes: "Compare with the live band option before deciding.",
    },
    {
      name: "Paper Petals",
      category: "Invitations",
      contact: "studio@paperpetals.example",
      estimatedCost: 8_000,
      quotedCost: 9_500,
      status: "declined",
      followUpDate: "",
      notes: "Over budget for letterpress. Keep as a backup.",
    },
  ];

  const vendors: VendorRecord[] = vendorSeeds.map((vendor, index) => ({
    ...vendor,
    id: `demo-vendor-${index + 1}`,
    eventId: DEMO_EVENT_ID,
    createdAt,
  }));

  return { event, budgetItems, tasks, vendors };
}
