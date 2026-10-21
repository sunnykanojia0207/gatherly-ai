export const EVENT_TYPE_VALUES = ["wedding", "birthday", "community"] as const;
export const TASK_PRIORITY_VALUES = ["low", "medium", "high"] as const;
export const VENDOR_STATUS_VALUES = ["considering", "contacted", "booked", "declined"] as const;
export const PRIORITY_VALUES = ["budget", "food", "music", "photography", "guests", "accessibility"] as const;
export const IDEA_SECTION_VALUES = ["themes", "decor", "food", "experience", "savings"] as const;
export const AI_ACTION_VALUES = [
  "themes",
  "decor",
  "food",
  "experience",
  "savings",
  "budget-improvement",
  "next-steps",
] as const;

export type EventType = (typeof EVENT_TYPE_VALUES)[number];
export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];
export type VendorStatus = (typeof VENDOR_STATUS_VALUES)[number];
export type Priority = (typeof PRIORITY_VALUES)[number];
export type IdeaSection = (typeof IDEA_SECTION_VALUES)[number];
export type AiAction = (typeof AI_ACTION_VALUES)[number];

export const AI_ACTION_LABELS: Record<AiAction, string> = {
  themes: "Theme ideas",
  decor: "Décor ideas",
  food: "Menu concepts",
  experience: "Guest experience",
  savings: "Find savings",
  "budget-improvement": "Improve the budget",
  "next-steps": "Next planning steps",
};

/** The curated section each AI action's suggestions belong in. */
export const AI_ACTION_SECTION: Record<AiAction, IdeaSection> = {
  themes: "themes",
  decor: "decor",
  food: "food",
  experience: "experience",
  savings: "savings",
  "budget-improvement": "savings",
  "next-steps": "experience",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Presentation hint for canonical badge tones. */
export const TASK_PRIORITY_TONES: Record<TaskPriority, "neutral" | "warning" | "danger"> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  considering: "Considering",
  contacted: "Contacted",
  booked: "Booked",
  declined: "Declined",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  budget: "Budget-friendly",
  food: "Great food",
  music: "Music & entertainment",
  photography: "Photography",
  guests: "Guest experience",
  accessibility: "Accessibility",
};

export const PRIORITY_OPTIONS = PRIORITY_VALUES.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

export const EVENT_TYPE_OPTIONS = EVENT_TYPE_VALUES.map((value) => ({
  value,
  label: EVENT_TYPE_LABELS[value],
}));

export const TASK_PRIORITY_OPTIONS = TASK_PRIORITY_VALUES.map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

export const VENDOR_STATUS_OPTIONS = VENDOR_STATUS_VALUES.map((value) => ({
  value,
  label: VENDOR_STATUS_LABELS[value],
}));
