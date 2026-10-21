import { z } from "zod";

import {
  AI_ACTION_VALUES,
  EVENT_TYPE_VALUES,
  IDEA_SECTION_VALUES,
  PRIORITY_VALUES,
  TASK_PRIORITY_VALUES,
  VENDOR_STATUS_VALUES,
} from "./labels";
import { isValidDateOnly } from "./format";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .refine(isValidDateOnly, "Choose a valid date");

const optionalDateSchema = z.union([dateOnlySchema, z.literal("")]);

export const eventTypeSchema = z.enum(EVENT_TYPE_VALUES);
export const taskPrioritySchema = z.enum(TASK_PRIORITY_VALUES);
export const vendorStatusSchema = z.enum(VENDOR_STATUS_VALUES);
export const prioritySchema = z.enum(PRIORITY_VALUES);
export const ideaSectionSchema = z.enum(IDEA_SECTION_VALUES);
export const aiActionSchema = z.enum(AI_ACTION_VALUES);

export const eventInputSchema = z.object({
  name: z.string().trim().min(2, "Give the event a name").max(80, "Keep the name under 80 characters"),
  type: eventTypeSchema,
  date: dateOnlySchema,
  location: z.string().trim().min(2, "Add a city or venue").max(120, "Keep the location under 120 characters"),
  guests: z
    .number({ error: "Enter the guest count" })
    .int("Use a whole number of guests")
    .min(1, "At least one guest is required")
    .max(10_000, "Guest count looks too high"),
  totalBudget: z
    .number({ error: "Enter a total budget" })
    .int("Use whole rupees")
    .min(1, "Budget must be greater than zero")
    .max(100_000_000, "Budget looks too high"),
  theme: z.string().trim().max(120, "Keep the theme under 120 characters"),
  priorities: z.array(prioritySchema).max(PRIORITY_VALUES.length),
});

export const eventRecordSchema = eventInputSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().min(1),
});

export const budgetItemSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  amount: z.number().int().min(0).max(100_000_000),
});

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title").max(120, "Keep the title under 120 characters"),
  dueDate: dateOnlySchema,
  priority: taskPrioritySchema,
});

export const taskRecordSchema = taskInputSchema.extend({
  id: z.string().min(1),
  eventId: z.string().min(1),
  done: z.boolean(),
  createdAt: z.string().min(1),
});

export const vendorInputSchema = z.object({
  name: z.string().trim().min(1, "Add the vendor name").max(80, "Keep the name under 80 characters"),
  category: z.string().trim().min(1, "Add a category").max(60, "Keep the category under 60 characters"),
  contact: z.string().trim().max(120, "Keep contact details under 120 characters"),
  estimatedCost: z
    .number({ error: "Enter an estimate" })
    .int("Use whole rupees")
    .min(0, "Cost cannot be negative")
    .max(100_000_000, "Cost looks too high"),
  quotedCost: z
    .number({ error: "Enter the quoted cost" })
    .int("Use whole rupees")
    .min(0, "Cost cannot be negative")
    .max(100_000_000, "Cost looks too high"),
  status: vendorStatusSchema,
  followUpDate: optionalDateSchema,
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
});

export const vendorRecordSchema = vendorInputSchema.extend({
  id: z.string().min(1),
  eventId: z.string().min(1),
  createdAt: z.string().min(1),
});

export const generatedIdeaSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  action: aiActionSchema,
  section: ideaSectionSchema,
  title: z.string().trim().min(1).max(90),
  detail: z.string().trim().min(1).max(500),
  why: z.string().trim().max(300).default(""),
  impact: z.string().trim().max(300).default(""),
  priority: taskPrioritySchema,
  costMin: z.number().int().min(0).max(100_000_000).nullable().default(null),
  costMax: z.number().int().min(0).max(100_000_000).nullable().default(null),
  costNote: z.string().trim().max(120).default(""),
  nextStep: z.string().trim().max(200).default(""),
  model: z.string().trim().min(1).max(80),
  generatedAt: z.string().min(1),
});

export const appStateSchema = z.object({
  version: z.literal(1),
  events: z.array(eventRecordSchema),
  activeEventId: z.string().nullable(),
  budgetItems: z.array(budgetItemSchema),
  tasks: z.array(taskRecordSchema),
  vendors: z.array(vendorRecordSchema),
  /** Keys of curated and AI ideas the planner saved, per event. */
  savedIdeas: z.array(z.string()).default([]),
  /** Keys of curated and AI ideas the planner dismissed, per event. */
  dismissedIdeas: z.array(z.string()).default([]),
  /** Model-generated ideas persisted so saved cards survive a refresh. */
  generatedIdeas: z.array(generatedIdeaSchema).max(200).default([]),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type EventRecord = z.infer<typeof eventRecordSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export type VendorInput = z.infer<typeof vendorInputSchema>;
export type VendorRecord = z.infer<typeof vendorRecordSchema>;
export type GeneratedIdea = z.infer<typeof generatedIdeaSchema>;
export type AppState = z.infer<typeof appStateSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

/** Shape validation plus the business rule that events cannot be created in the past. */
export function validateEventInput(input: unknown, today: string): ValidationResult<EventInput> {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (parsed.data.date < today) {
    return { ok: false, errors: { date: "Choose today or a future date" } };
  }
  return { ok: true, data: parsed.data };
}
