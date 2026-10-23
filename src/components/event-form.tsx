"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { formatDate, formatINR, todayISO } from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  type EventType,
  type Priority,
} from "@/lib/labels";
import {
  eventInputSchema,
  fieldErrors,
  validateEventInput,
  type EventInput,
} from "@/lib/schema";
import { useGatherly } from "@/lib/store";
import { EventMotif } from "@/components/motifs";
import { Button, Field, Input, Textarea } from "@/components/ui";

const STEPS = [
  {
    short: "Occasion",
    title: "What are we gathering for?",
    description: "Start with the occasion. The details can follow.",
  },
  {
    short: "Place & date",
    title: "When and where",
    description: "A date gives the plan its rhythm; a place gives it a home.",
  },
  {
    short: "Scale",
    title: "How many, and how much?",
    description: "Guest count and total budget shape every later decision.",
  },
  {
    short: "Mood",
    title: "Set the tone",
    description: "Optional, but it helps every idea feel like yours.",
  },
  {
    short: "Review",
    title: "One last look",
    description: "Check the essentials, then create the event. Budget, tasks, and vendors stay editable.",
  },
] as const;

const STEP_FIELDS: Array<Array<keyof EventInput>> = [
  ["name", "type"],
  ["date", "location"],
  ["guests", "totalBudget"],
  ["theme", "priorities"],
  [],
];

const TYPE_BLURBS: Record<EventType, string> = {
  wedding: "Ceremony and reception",
  birthday: "A milestone, marked",
  community: "Many hands, one day",
};

function toNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

export function EventForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const { createEvent } = useGatherly().actions;
  const uid = useId();
  const fieldId = (field: string) => `${uid}-${field}`;
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("wedding");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [theme, setTheme] = useState("");
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const describedBy = (field: string) => (errors[field] ? `${fieldId(field)}-error` : undefined);

  function clearError(field: string) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function togglePriority(value: Priority) {
    setPriorities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
    clearError("priorities");
  }

  function collectErrors(fields: ReadonlyArray<keyof EventInput>): Record<string, string> {
    if (fields.length === 0) return {};
    const parsed = eventInputSchema.safeParse({
      name,
      type,
      date: date || todayISO(),
      location,
      guests: toNumber(guests),
      totalBudget: toNumber(totalBudget),
      theme,
      priorities,
    });
    const all = parsed.success ? {} : fieldErrors(parsed.error);
    if (!date) all.date = "Choose a date";
    else if (date < todayISO()) all.date = "Choose today or a future date";

    const picked: Record<string, string> = {};
    for (const field of fields) {
      if (all[field]) picked[field] = all[field];
    }
    return picked;
  }

  function validateStep(): boolean {
    const stepErrors = collectErrors(STEP_FIELDS[step]);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setStatus("Please fix the highlighted fields before continuing.");
      return false;
    }
    setStatus("");
    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < STEPS.length - 1) {
      if (validateStep()) setStep((current) => current + 1);
      return;
    }

    const result = validateEventInput(
      {
        name,
        type,
        date,
        location,
        guests: toNumber(guests),
        totalBudget: toNumber(totalBudget),
        theme,
        priorities,
      },
      todayISO(),
    );

    if (!result.ok) {
      setErrors(result.errors);
      setStatus("Please fix the highlighted fields.");
      const firstInvalid = STEP_FIELDS.findIndex((fields) =>
        fields.some((field) => result.errors[field]),
      );
      if (firstInvalid >= 0) setStep(firstInvalid);
      return;
    }

    const created = createEvent(result.data);
    if (!created) {
      setStatus("Could not create the event. Check the fields and try again.");
      return;
    }

    setErrors({});
    router.push("/");
  }

  const perGuest = toNumber(totalBudget) / toNumber(guests);
  const showPerGuest = Number.isFinite(perGuest) && perGuest > 0;

  return (
    <div className="grid overflow-hidden lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="plum-texture p-5 text-on-dark sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orchid">
          New event
        </p>
        <p className="mt-2 hidden font-display text-2xl leading-tight text-on-dark lg:block">
          Set the scene, one decision at a time.
        </p>

        <div className="mt-4 lg:hidden">
          <p className="text-sm font-medium text-on-dark">
            Step {step + 1} of {STEPS.length} · {STEPS[step].short}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-on-dark/15">
            <div
              className="h-full rounded-full bg-orchid transition-[width] duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <ol className="mt-6 hidden space-y-1 lg:block">
          {STEPS.map((item, index) => {
            const complete = index < step;
            const active = index === step;
            return (
              <li key={item.short}>
                <button
                  type="button"
                  onClick={() => {
                    if (index < step) {
                      setStep(index);
                      setStatus("");
                    }
                  }}
                  disabled={index > step}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-on-dark/10 font-medium text-on-dark"
                      : complete
                        ? "text-on-dark-soft hover:bg-on-dark/5 hover:text-on-dark"
                        : "text-on-dark-faint"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                      active
                        ? "bg-on-dark text-plum"
                        : complete
                          ? "bg-on-dark/15 text-on-dark"
                          : "border border-on-dark/20 text-on-dark-faint"
                    }`}
                  >
                    {complete ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  {item.short}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 hidden text-[11px] leading-relaxed text-on-dark-faint lg:block">
          Every choice can be revisited before you create. A starter budget is created with the event.
        </p>
      </aside>

      <form noValidate onSubmit={handleSubmit} className="bg-surface p-5 sm:p-7 lg:p-8">
        <div key={step} className="enter-step">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-display text-[1.7rem] leading-tight tracking-tight text-ink outline-none sm:text-3xl"
          >
            {STEPS[step].title}
          </h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-soft">
            {STEPS[step].description}
          </p>

          <div className="mt-6 space-y-5">
            {step === 0 ? (
              <>
                <Field
                  label="Event name"
                  htmlFor={fieldId("name")}
                  error={errors.name}
                  hint="This is how the event appears everywhere in Gatherly."
                >
                  <Input
                    id={fieldId("name")}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearError("name");
                    }}
                    placeholder="Meera & Arjun's Wedding"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name) || undefined}
                    aria-describedby={describedBy("name")}
                    className="h-12 text-base"
                  />
                </Field>

                <fieldset>
                  <legend className="text-sm font-medium text-ink">Type of gathering</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((value) => {
                      const selected = type === value;
                      return (
                        <label
                          key={value}
                          className={`relative cursor-pointer rounded-xl border p-3 transition-[border-color,background-color,box-shadow] focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 sm:p-4 ${
                            selected
                              ? "border-accent/50 bg-accent-soft/60 shadow-soft"
                              : "border-line bg-surface hover:border-accent/25 hover:bg-surface-tint"
                          }`}
                        >
                          <input
                            type="radio"
                            name="event-type"
                            value={value}
                            checked={selected}
                            onChange={() => setType(value)}
                            className="sr-only"
                          />
                          <EventMotif
                            type={value}
                            className={`h-14 w-full sm:h-16 ${
                              selected ? "text-accent" : "text-ink-faint"
                            }`}
                          />
                          <span className="mt-1 block text-sm font-semibold text-ink">
                            {EVENT_TYPE_LABELS[value]}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
                            {TYPE_BLURBS[value]}
                          </span>
                          {selected ? (
                            <CheckCircle2
                              aria-hidden="true"
                              className="absolute right-2.5 top-2.5 h-4 w-4 text-accent"
                            />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Event date"
                  htmlFor={fieldId("date")}
                  error={errors.date}
                  hint="Today or later."
                >
                  <Input
                    id={fieldId("date")}
                    type="date"
                    min={todayISO()}
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      clearError("date");
                    }}
                    aria-invalid={Boolean(errors.date) || undefined}
                    aria-describedby={describedBy("date")}
                  />
                </Field>

                <Field
                  label="City or venue"
                  htmlFor={fieldId("location")}
                  error={errors.location}
                  hint="A city is enough for now."
                >
                  <Input
                    id={fieldId("location")}
                    value={location}
                    onChange={(event) => {
                      setLocation(event.target.value);
                      clearError("location");
                    }}
                    placeholder="Mumbai, India"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.location) || undefined}
                    aria-describedby={describedBy("location")}
                  />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Guests" htmlFor={fieldId("guests")} error={errors.guests}>
                    <Input
                      id={fieldId("guests")}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={guests}
                      onChange={(event) => {
                        setGuests(event.target.value);
                        clearError("guests");
                      }}
                      placeholder="120"
                      aria-invalid={Boolean(errors.guests) || undefined}
                      aria-describedby={describedBy("guests")}
                    />
                  </Field>

                  <Field
                    label="Total budget (₹)"
                    htmlFor={fieldId("budget")}
                    error={errors.totalBudget}
                    hint="Category amounts can change later."
                  >
                    <Input
                      id={fieldId("budget")}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1000}
                      value={totalBudget}
                      onChange={(event) => {
                        setTotalBudget(event.target.value);
                        clearError("totalBudget");
                      }}
                      placeholder="450000"
                      aria-invalid={Boolean(errors.totalBudget) || undefined}
                      aria-describedby={describedBy("totalBudget")}
                    />
                  </Field>
                </div>
                <div className="rounded-xl bg-lilac/60 px-4 py-3 text-sm text-ink-soft">
                  {showPerGuest ? (
                    <>
                      That is about{" "}
                      <span className="font-medium text-ink">{formatINR(perGuest)}</span> per
                      guest — before any category is fine-tuned.
                    </>
                  ) : (
                    "Add both numbers to see an approximate cost per guest."
                  )}
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Field
                  label="Theme or mood"
                  htmlFor={fieldId("theme")}
                  error={errors.theme}
                  hint="Optional — a sentence is enough."
                >
                  <Textarea
                    id={fieldId("theme")}
                    value={theme}
                    onChange={(event) => {
                      setTheme(event.target.value);
                      clearError("theme");
                    }}
                    placeholder="Warm ivory, marigold, and candid moments"
                    rows={3}
                    aria-invalid={Boolean(errors.theme) || undefined}
                    aria-describedby={describedBy("theme")}
                  />
                </Field>

                <fieldset>
                  <legend className="text-sm font-medium text-ink">What matters most?</legend>
                  <p className="mt-1 text-xs text-ink-soft">
                    Optional. Shapes curated ideas and live AI suggestions.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {PRIORITY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm text-ink transition-colors ${
                          priorities.includes(option.value)
                            ? "border-accent/40 bg-accent-soft/60"
                            : "border-line bg-surface hover:bg-surface-tint"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#6c3fb5]"
                          checked={priorities.includes(option.value)}
                          onChange={() => togglePriority(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : null}

            {step === 4 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-line">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                      The occasion
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="text-xs font-medium text-accent hover:text-accent-strong"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="px-4 py-3">
                    <p className="font-display text-xl text-ink">{name}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {EVENT_TYPE_LABELS[type]}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        Place & date
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-medium text-accent hover:text-accent-strong"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">{formatDate(date)}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{location}</p>
                  </div>

                  <div className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        Scale
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-xs font-medium text-accent hover:text-accent-strong"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">
                      {toNumber(guests)} guests
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {formatINR(toNumber(totalBudget))} total budget
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                      Mood & priorities
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-xs font-medium text-accent hover:text-accent-strong"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {theme.trim() || "No theme set yet."}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {priorities.length > 0 ? (
                      priorities.map((value) => (
                        <span
                          key={value}
                          className="rounded-full bg-lilac px-2.5 py-0.5 text-[11px] font-medium text-accent"
                        >
                          {PRIORITY_LABELS[value]}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-faint">No priorities chosen.</span>
                    )}
                  </div>
                </div>

                <p className="rounded-xl bg-lilac/50 px-4 py-3 text-xs leading-relaxed text-ink-soft">
                  A starter budget with sensible categories is created with this event. Nothing
                  is sent anywhere — everything stays in this browser.
                </p>
              </div>
            ) : null}
          </div>

          {status ? (
            <p role="alert" className="mt-5 text-sm font-medium text-danger">
              {status}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <div>
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep((current) => current - 1);
                    setStatus("");
                  }}
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back
                </Button>
              ) : onCancel ? (
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              ) : null}
            </div>
            <Button type="submit">
              {step === STEPS.length - 1 ? (
                "Create event"
              ) : (
                <>
                  Continue <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
