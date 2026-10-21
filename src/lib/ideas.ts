import { addDays, formatINR } from "./format";
import {
  EVENT_TYPE_LABELS,
  PRIORITY_LABELS,
  type EventType,
  type IdeaSection,
  type Priority,
} from "./labels";
import type { BudgetItem, EventRecord } from "./schema";

export type { IdeaSection };

export const IDEA_SECTIONS: ReadonlyArray<{ id: IdeaSection; label: string }> = [
  { id: "themes", label: "Themes" },
  { id: "decor", label: "Décor & styling" },
  { id: "food", label: "Food & drink" },
  { id: "experience", label: "Guest experience" },
  { id: "savings", label: "Savings" },
];

export interface SampleIdea {
  title: string;
  detail: string;
}

export const SAMPLE_IDEAS: Record<EventType, Record<IdeaSection, SampleIdea[]>> = {
  wedding: {
    themes: [
      {
        title: "Ivory & marigold courtyard",
        detail:
          "Keep the palette to warm ivory, marigold, and brass. It photographs beautifully in late-afternoon light and hides heat-related wilt better than pale flowers.",
      },
      {
        title: "Coastal minimal",
        detail:
          "Sandy neutrals, cane furniture, and a single statement backdrop. Fewer props mean lower décor spend and a calmer setup on the day.",
      },
    ],
    decor: [
      {
        title: "Marigold canopy entrance",
        detail:
          "A narrow canopy of marigold strings costs far less than an imported floral arch and gives guests an obvious arrival moment.",
      },
      {
        title: "Muted brass tablescape",
        detail:
          "Reuse the ceremony urns on reception tables with brass votives. Ask the decorator to include this in the original quote.",
      },
    ],
    food: [
      {
        title: "Regional thali stations",
        detail:
          "Three regional counters (Maharashtrian, Gujarati, South Indian) cost less than a sprawling buffet and give guests a talking point.",
      },
      {
        title: "Late-night chaat counter",
        detail:
          "A compact chaat station keeps the dance floor busy and is usually the most remembered bite of the night.",
      },
    ],
    experience: [
      {
        title: "Mehendi storytelling corner",
        detail:
          "A quiet seating nook with family wedding photos and a mehendi artist. It gives older guests a comfortable place away from the music.",
      },
      {
        title: "Sunset sangeet soundcheck",
        detail:
          "Invite the immediate family to a 20-minute soundcheck before guests arrive. It doubles as a relaxed photo session.",
      },
    ],
    savings: [
      {
        title: "Reuse ceremony florals at the reception",
        detail:
          "Confirm with the decorator that ceremony arrangements can be moved indoors. This typically saves 10–15% of the décor budget.",
      },
      {
        title: "Book venue and catering as a package",
        detail:
          "Ask for a combined quote and a waiver on the venue rental. Bundled contracts often leave room for one extra course.",
      },
    ],
  },
  birthday: {
    themes: [
      {
        title: "Golden-hour garden picnic",
        detail:
          "Low tables, cushions, and warm string lights. Works for mixed-age groups and needs very little structured entertainment.",
      },
      {
        title: "Retro vinyl lounge",
        detail:
          "A borrowed record player, checkered textiles, and a signature mocktail. The theme reads clearly without custom props.",
      },
    ],
    decor: [
      {
        title: "Photo garland through the years",
        detail:
          "Print one photo per year and clip them along a single line. Cheap, personal, and gives guests something to browse.",
      },
      {
        title: "Candlelit long table",
        detail:
          "One long rented table with candles beats scattered centrepieces and makes conversation easier across the group.",
      },
    ],
    food: [
      {
        title: "Make-your-own taco bar",
        detail:
          "Two proteins, one vegetarian filling, and a toppings bar. It scales easily and keeps per-head costs predictable.",
      },
      {
        title: "Dessert grazing table",
        detail:
          "Skip the tiered cake for a small cutting cake plus a dessert table. Guests graze all evening and nothing goes stale.",
      },
    ],
    experience: [
      {
        title: "Polaroid guest book",
        detail:
          "Guests snap a photo and write a note beside it. The album becomes the keepsake instead of a printed guest book.",
      },
      {
        title: "Live caricature artist",
        detail:
          "A two-hour caricature station keeps guests entertained during the slower post-dinner window without a stage programme.",
      },
    ],
    savings: [
      {
        title: "Potluck dessert sign-up",
        detail:
          "Ask a few close friends to bring a dessert. It cuts the bakery order and makes the table feel personal.",
      },
      {
        title: "Book the venue on a weekday",
        detail:
          "Friday and Sunday rates are often 15–20% lower than Saturday for the same space and menu.",
      },
    ],
  },
  community: {
    themes: [
      {
        title: "Open-air neighbourhood fair",
        detail:
          "A flat, accessible ground with clear zones for food, activities, and seating. Keep the layout legible from the entrance.",
      },
      {
        title: "Heritage courtyard gathering",
        detail:
          "Use a local courtyard or school ground and lean into the architecture instead of building a set.",
      },
    ],
    decor: [
      {
        title: "Bunting made by local schools",
        detail:
          "Commission fabric bunting from a school art club. It costs little, involves the community, and can be reused next year.",
      },
      {
        title: "Chalkboard wayfinding",
        detail:
          "Hand-painted boards at each zone remove the need for printed signage and are easy to update on the day.",
      },
    ],
    food: [
      {
        title: "Food-truck row",
        detail:
          "Three local vendors with distinct menus reduce queue times and let each business keep its own pricing.",
      },
      {
        title: "Community potluck tables",
        detail:
          "Label dishes with ingredients and allergens. A shared table is the cheapest way to feed a large crowd.",
      },
    ],
    experience: [
      {
        title: "Skill-sharing booths",
        detail:
          "Invite residents to teach a 15-minute skill — rangoli, repair, coding basics. It turns attendees into participants.",
      },
      {
        title: "Volunteer thank-you wall",
        detail:
          "A visible wall with names and photos makes volunteers feel recognised and helps recruit for the next edition.",
      },
    ],
    savings: [
      {
        title: "Borrow tables from local businesses",
        detail:
          "Offer a thank-you mention in return. Renting 20 tables is often one of the largest avoidable line items.",
      },
      {
        title: "Recruit the volunteer crew early",
        detail:
          "A confirmed crew six weeks out prevents last-minute paid labour and keeps setup day calm.",
      },
    ],
  },
};

/** Stable key so saved and dismissed ideas survive refreshes without touching idea copy. */
export function ideaKey(eventId: string, section: IdeaSection, title: string): string {
  return `${eventId}|${section}|${title}`;
}

/** AI ideas get their own namespace so a model title can never collide with curated copy. */
export function aiIdeaKey(eventId: string, id: string): string {
  return `${eventId}|ai|${id}`;
}

export function ideaBelongsToEvent(key: string, eventId: string): boolean {
  return key.startsWith(`${eventId}|`);
}

const SECTION_CATEGORY_HINTS: Record<IdeaSection, string[]> = {
  themes: ["decor", "venue"],
  decor: ["decor", "venue"],
  food: ["catering", "food"],
  experience: ["entertainment", "experience"],
  savings: [],
};

const SECTION_PRIORITIES: Partial<Record<IdeaSection, Priority[]>> = {
  food: ["food"],
  experience: ["music", "guests", "accessibility"],
  savings: ["budget"],
};

export interface IdeaFit {
  impact: string;
  why: string;
}

/** Budget impact and fit are computed from the active event, never stored as fake facts. */
export function ideaFit(
  section: IdeaSection,
  event: EventRecord,
  budgetItems: ReadonlyArray<BudgetItem>,
): IdeaFit {
  const planned = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const remaining = event.totalBudget - planned;
  const hints = SECTION_CATEGORY_HINTS[section];
  const category = budgetItems.find((item) =>
    hints.some((hint) => item.name.toLowerCase().includes(hint)),
  );
  const categoryName = section === "food" ? "Catering" : section === "experience" ? "Entertainment" : "Décor";

  let impact: string;
  if (section === "savings") {
    impact =
      remaining > 0
        ? `Today’s buffer: ${formatINR(remaining)}`
        : "Aim: reduce planned spend";
  } else if (section === "themes") {
    impact =
      category && category.amount > 0
        ? `Uses the ${formatINR(category.amount)} décor plan`
        : "Low direct cost";
  } else if (category && category.amount > 0) {
    impact = `${categoryName} plan: ${formatINR(category.amount)}`;
  } else {
    impact = `${categoryName} budget not set`;
  }

  const priority = (SECTION_PRIORITIES[section] ?? []).find((value) =>
    event.priorities.includes(value),
  );
  let why: string;
  if (priority) {
    why = `You marked “${PRIORITY_LABELS[priority]}” as a priority.`;
  } else if (event.theme && (section === "themes" || section === "decor")) {
    why = `Fits your theme: “${event.theme}”.`;
  } else {
    why = `Written for a ${EVENT_TYPE_LABELS[event.type].toLowerCase()} with ${event.guests} guests.`;
  }

  return { impact, why };
}

/** A realistic first due date for an idea turned into a task: two weeks before the event. */
export function ideaTaskDueDate(eventDate: string, today: string): string {
  const preferred = addDays(eventDate, -14);
  return preferred < today ? today : preferred;
}

