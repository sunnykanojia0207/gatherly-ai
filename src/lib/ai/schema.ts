import { z } from "zod";

import { isValidDateOnly } from "../format";
import { EVENT_TYPE_VALUES, PRIORITY_VALUES } from "../labels";
import { aiActionSchema, generatedIdeaSchema, taskPrioritySchema } from "../schema";

export const DEFAULT_AI_MODEL = "gemini-3.8-flash";
export const AI_IDEA_COUNT = 4;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .refine(isValidDateOnly, "Choose a valid date");

const budgetLineSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    amount: z.number().int().min(0).max(100_000_000),
  })
  .strict();

/** Untrusted payload accepted by POST /api/ideas. Unknown keys are rejected. */
export const aiIdeaRequestSchema = z
  .object({
    eventId: z.string().trim().min(1).max(80),
    action: aiActionSchema,
    event: z
      .object({
        name: z.string().trim().min(1).max(80),
        type: z.enum(EVENT_TYPE_VALUES),
        date: dateOnlySchema,
        location: z.string().trim().min(1).max(120),
        guests: z.number().int().min(1).max(10_000),
        totalBudget: z.number().int().min(1).max(100_000_000),
        currency: z
          .string()
          .trim()
          .regex(/^[A-Z]{3}$/)
          .default("INR"),
        theme: z.string().trim().max(120).default(""),
        priorities: z.array(z.enum(PRIORITY_VALUES)).max(PRIORITY_VALUES.length).default([]),
      })
      .strict(),
    budgetItems: z.array(budgetLineSchema).max(20).default([]),
    constraints: z.string().trim().max(300).default(""),
  })
  .strict();

/**
 * Model-facing idea. Cost is optional: omit both bounds when no reliable range
 * can be estimated. The prompt forbids inventing exact quotes.
 */
export const aiModelIdeaSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  whyItFits: z.string().trim().min(1),
  priority: taskPrioritySchema,
  budgetImpact: z.string().trim().default(""),
  costMin: z.number().int().min(0).nullable().optional(),
  costMax: z.number().int().min(0).nullable().optional(),
  costNote: z.string().trim().max(120).default(""),
  nextStep: z.string().trim().default(""),
});

export const aiModelResponseSchema = z.object({
  ideas: z.array(aiModelIdeaSchema).min(1).max(6),
});

/** What the browser receives: fully validated, persisted-ready idea records. */
export const aiIdeasResponseSchema = z.object({
  ideas: z.array(generatedIdeaSchema).min(1).max(6),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  generatedAt: z.string().min(1),
});

export type AiIdeaRequest = z.infer<typeof aiIdeaRequestSchema>;
export type AiModelIdea = z.infer<typeof aiModelIdeaSchema>;
export type AiIdeasResponse = z.infer<typeof aiIdeasResponseSchema>;

// Gemini's responseJsonSchema accepts only this JSON Schema subset.
const SUPPORTED_SCHEMA_KEYS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

function cleanSchemaMap(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cleanSchema(child)]),
  );
}

function cleanSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanSchema);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => SUPPORTED_SCHEMA_KEYS.has(key))
      .map(([key, child]) => [
        key,
        key === "properties" || key === "$defs" ? cleanSchemaMap(child) : cleanSchema(child),
      ]),
  );
}

/**
 * JSON Schema for Gemini structured output. Zod emits `default`, `minLength`
 * and `maxLength`, which the API does not accept; local Zod validation still
 * enforces them on the response.
 */
export function aiResponseJsonSchema(): Record<string, unknown> {
  return cleanSchema(z.toJSONSchema(aiModelResponseSchema)) as Record<string, unknown>;
}
