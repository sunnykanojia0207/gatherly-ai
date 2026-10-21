"use client";

import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  Lightbulb,
  ListPlus,
  Loader2,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  Eyebrow,
  LoadingPanel,
  NoEventState,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { aiIdeasResponseSchema } from "@/lib/ai/schema";
import { formatDate, formatINR, todayISO } from "@/lib/format";
import {
  IDEA_SECTIONS,
  SAMPLE_IDEAS,
  aiIdeaKey,
  ideaFit,
  ideaKey,
  ideaTaskDueDate,
  type IdeaSection,
  type SampleIdea,
} from "@/lib/ideas";
import {
  AI_ACTION_LABELS,
  AI_ACTION_SECTION,
  AI_ACTION_VALUES,
  EVENT_TYPE_LABELS,
  type AiAction,
} from "@/lib/labels";
import type { GeneratedIdea } from "@/lib/schema";
import { useGatherly } from "@/lib/store";

const SECTION_META: Record<
  IdeaSection,
  {
    blurb: string;
    tone: "orchid" | "accent" | "blush" | "sage" | "champagne";
    dot: string;
    activeTab: string;
  }
> = {
  themes: {
    blurb: "A direction the whole celebration can hang on.",
    tone: "orchid",
    dot: "bg-orchid",
    activeTab: "border-orchid bg-orchid-soft text-accent-strong",
  },
  decor: {
    blurb: "What guests notice first, and what you keep paying for.",
    tone: "accent",
    dot: "bg-accent",
    activeTab: "border-accent/40 bg-accent-soft text-accent-strong",
  },
  food: {
    blurb: "The part of the evening people talk about on the way home.",
    tone: "blush",
    dot: "bg-blush",
    activeTab: "border-blush-deep/30 bg-[#fdeeea] text-blush-deep",
  },
  experience: {
    blurb: "Small moments that make a room feel looked after.",
    tone: "sage",
    dot: "bg-sage",
    activeTab: "border-sage-deep/30 bg-[#eaf5ee] text-sage-deep",
  },
  savings: {
    blurb: "Spend less without cutting the moment.",
    tone: "champagne",
    dot: "bg-champagne",
    activeTab: "border-champagne-deep/30 bg-[#fbf3e2] text-champagne-deep",
  },
};

interface IdeaEntry extends SampleIdea {
  key: string;
  section: IdeaSection;
  sectionLabel: string;
  source: "curated" | "ai";
  why?: string;
  impact?: string;
  costMin?: number | null;
  costMax?: number | null;
  costNote?: string;
  nextStep?: string;
  generatedAt?: string;
}

function generatedEntry(idea: GeneratedIdea): IdeaEntry {
  const sectionLabel =
    IDEA_SECTIONS.find((section) => section.id === idea.section)?.label ?? idea.section;
  return {
    key: aiIdeaKey(idea.eventId, idea.id),
    section: idea.section,
    sectionLabel,
    source: "ai",
    title: idea.title,
    detail: idea.detail,
    why: idea.why,
    impact: idea.impact,
    costMin: idea.costMin,
    costMax: idea.costMax,
    costNote: idea.costNote,
    nextStep: idea.nextStep,
    generatedAt: idea.generatedAt,
  };
}

interface AiErrorState {
  action: AiAction;
  code: string;
  message: string;
}

export default function IdeasPage() {
  const { state, ready, activeEvent, actions } = useGatherly();
  const [activeSection, setActiveSection] = useState<IdeaSection | "all">("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [constraints, setConstraints] = useState("");
  const [generating, setGenerating] = useState<AiAction | null>(null);
  const [aiError, setAiError] = useState<AiErrorState | null>(null);
  const [aiStatus, setAiStatus] = useState("");

  if (!ready) return <LoadingPanel label="Loading ideas" />;
  if (!activeEvent) {
    return (
      <div>
        <PageHeader
          eyebrow="AI Ideas"
          title="Ideas worth borrowing"
          description="Thoughtful starting points for themes, décor, food, and guest experience."
        />
        <NoEventState />
      </div>
    );
  }

  const today = todayISO();
  const eventDate = activeEvent.date;
  const ideas = SAMPLE_IDEAS[activeEvent.type];
  const budgetItems = state.budgetItems.filter((item) => item.eventId === activeEvent.id);
  const tasks = state.tasks.filter((task) => task.eventId === activeEvent.id);
  const savedSet = new Set(state.savedIdeas);
  const dismissedSet = new Set(state.dismissedIdeas);
  const timelineTitles = new Set(tasks.map((task) => task.title.trim().toLowerCase()));

  const generatedEntries: IdeaEntry[] = state.generatedIdeas
    .filter((idea) => idea.eventId === activeEvent.id)
    .map(generatedEntry);
  const generatedTitles = new Set(
    generatedEntries.map((entry) => `${entry.section}|${entry.title.trim().toLowerCase()}`),
  );

  const curatedEntries: IdeaEntry[] = IDEA_SECTIONS.flatMap((section) =>
    ideas[section.id]
      .filter(
        (idea) =>
          !generatedTitles.has(`${section.id}|${idea.title.trim().toLowerCase()}`),
      )
      .map((idea) => ({
        ...idea,
        key: ideaKey(activeEvent.id, section.id, idea.title),
        section: section.id,
        sectionLabel: section.label,
        source: "curated" as const,
      })),
  );

  const entries = [...generatedEntries, ...curatedEntries];

  const liveEntries = entries.filter((entry) => !dismissedSet.has(entry.key));
  const savedCount = liveEntries.filter((entry) => savedSet.has(entry.key)).length;
  const dismissedEntries = entries.filter((entry) => dismissedSet.has(entry.key));

  const sectionsToRender = IDEA_SECTIONS.map((section) => ({
    ...section,
    items: liveEntries.filter(
      (entry) =>
        entry.section === section.id && (!savedOnly || savedSet.has(entry.key)),
    ),
  })).filter(
    (section) =>
      (activeSection === "all" || activeSection === section.id) && section.items.length > 0,
  );

  function handleSave(entry: IdeaEntry) {
    if (savedSet.has(entry.key)) {
      actions.unsaveIdea(entry.key);
      setStatus(`Removed “${entry.title}” from saved ideas.`);
    } else {
      actions.saveIdea(entry.key);
      setStatus(`Saved “${entry.title}” to revisit.`);
    }
  }

  function handleDismiss(entry: IdeaEntry) {
    actions.dismissIdea(entry.key);
    setStatus(`Set “${entry.title}” aside. You can restore it at the bottom of the page.`);
  }

  function handleRestore(entry: IdeaEntry) {
    actions.restoreIdea(entry.key);
    setStatus(`Restored “${entry.title}”.`);
  }

  function handleAddTask(entry: IdeaEntry) {
    const dueDate = ideaTaskDueDate(eventDate, today);
    actions.addTask({ title: entry.title, dueDate, priority: "medium" });
    actions.saveIdea(entry.key);
    setStatus(`Added “${entry.title}” to the timeline, due ${formatDate(dueDate)}.`);
  }

  async function handleGenerate(action: AiAction) {
    const event = activeEvent;
    if (generating || !event) return;
    setGenerating(action);
    setAiError(null);
    setAiStatus("");

    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          action,
          event: {
            name: event.name,
            type: event.type,
            date: event.date,
            location: event.location,
            guests: event.guests,
            totalBudget: event.totalBudget,
            currency: "INR",
            theme: event.theme,
            priorities: event.priorities,
          },
          budgetItems: budgetItems.map((item) => ({
            name: item.name,
            amount: item.amount,
          })),
          constraints,
        }),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = data as { error?: { code?: string; message?: string } } | null;
        setAiError({
          action,
          code: error?.error?.code ?? "unavailable",
          message:
            error?.error?.message ??
            "Gemini could not generate ideas right now. Curated ideas are still available.",
        });
        return;
      }

      const parsed = aiIdeasResponseSchema.safeParse(data);
      if (!parsed.success) {
        setAiError({
          action,
          code: "invalid_output",
          message: "Gemini returned ideas in an unexpected shape. Nothing was saved.",
        });
        return;
      }

      const section = AI_ACTION_SECTION[action];
      actions.setGeneratedIdeas(event.id, action, parsed.data.ideas);
      setActiveSection(section);
      setSavedOnly(false);
      setAiStatus(
        `Added ${parsed.data.ideas.length} Gemini ${
          parsed.data.ideas.length === 1 ? "idea" : "ideas"
        } to ${IDEA_SECTIONS.find((item) => item.id === section)?.label ?? section}.`,
      );
    } catch {
      setAiError({
        action,
        code: "unavailable",
        message: "Could not reach the ideas service. Check your connection and try again.",
      });
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Ideas"
        title="Ideas worth borrowing"
        description={`Curated starting points plus live Gemini suggestions for ${activeEvent.name}. Save what fits, set aside what does not, and turn a keeper into a timeline task.`}
      >
        <Badge tone="orchid">
          <Sparkles aria-hidden="true" className="h-3 w-3" />{" "}
          {EVENT_TYPE_LABELS[activeEvent.type]}
        </Badge>
        <Badge tone={savedCount > 0 ? "sage" : "neutral"}>
          {savedCount} saved
        </Badge>
      </PageHeader>

      <div className="flex gap-3 rounded-2xl border border-champagne-deep/15 bg-[#fdf8ee] p-4 text-sm">
        <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-champagne-deep" />
        <p className="text-ink-soft">
          <span className="font-semibold text-ink">Curated examples and live AI.</span> Cards
          marked Gemini are generated for this event; the curated ones ship with the app. If
          Gemini is unavailable, every curated idea stays available below.
        </p>
      </div>

      <Card className="enter p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <Eyebrow className="text-accent">Live AI</Eyebrow>
            <h2 className="mt-1 font-display text-2xl tracking-tight text-ink">
              Plan with Gemini
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Uses this event&apos;s date, guest count, budget allocation, and priorities.
              Costs are estimates, never quotes.
            </p>
          </div>
          <Badge tone="orchid">
            <Sparkles aria-hidden="true" className="h-3 w-3" /> Gemini
          </Badge>
        </div>

        <div className="mt-4">
          <label
            htmlFor="ai-constraints"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Dietary, cultural, or accessibility notes{" "}
            <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <Textarea
            id="ai-constraints"
            value={constraints}
            maxLength={300}
            rows={2}
            className="min-h-16"
            placeholder="e.g. vegetarian menu, wheelchair access, no late-night music"
            onChange={(event) => setConstraints(event.target.value)}
          />
        </div>

        <div
          role="group"
          aria-label="Generate Gemini ideas for"
          className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          {AI_ACTION_VALUES.map((action) => {
            const busy = generating === action;
            return (
              <Button
                key={action}
                variant="secondary"
                className="h-10 justify-start px-3 text-xs"
                disabled={generating !== null}
                aria-busy={busy}
                onClick={() => void handleGenerate(action)}
              >
                {busy ? (
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                )}
                {AI_ACTION_LABELS[action]}
              </Button>
            );
          })}
        </div>

        {generating ? (
          <div className="mt-4">
            <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-accent" />
              Generating {AI_ACTION_LABELS[generating].toLowerCase()}…
            </p>
            <div aria-hidden="true" className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="h-24 animate-pulse rounded-xl bg-lilac" />
              <div className="h-24 animate-pulse rounded-xl bg-lilac" />
            </div>
          </div>
        ) : null}

        {aiError ? (
          <div className="mt-4 space-y-2">
            <Alert
              tone={aiError.code === "not_configured" ? "warning" : "danger"}
              title={
                aiError.code === "not_configured"
                  ? "Live AI is not configured"
                  : "Gemini could not finish that"
              }
            >
              <p>{aiError.message}</p>
              <Button
                variant="secondary"
                className="mt-3 h-8 px-3 text-xs"
                onClick={() => void handleGenerate(aiError.action)}
              >
                Try again
              </Button>
            </Alert>
          </div>
        ) : null}

        {aiStatus ? (
          <p role="status" className="mt-4 text-sm text-ink-soft">
            {aiStatus}
          </p>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Regenerating an action replaces its previous unsaved Gemini ideas. Cards you save or
          set aside stay put.
        </p>
      </Card>

      {status ? (
        <p role="status" className="text-sm text-ink-soft">
          {status}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filter ideas by section"
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            aria-pressed={activeSection === "all"}
            onClick={() => setActiveSection("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeSection === "all"
                ? "border-plum bg-plum text-on-dark"
                : "border-line bg-surface text-ink-soft hover:border-accent/30 hover:text-ink"
            }`}
          >
            All ideas
            <span
              className={`ml-1.5 tabular-nums ${
                activeSection === "all" ? "text-on-dark-soft" : "text-ink-faint"
              }`}
            >
              {liveEntries.length}
            </span>
          </button>
          {IDEA_SECTIONS.map((section) => {
            const count = liveEntries.filter((entry) => entry.section === section.id).length;
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveSection(section.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? SECTION_META[section.id].activeTab
                    : "border-line bg-surface text-ink-soft hover:border-accent/30 hover:text-ink"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${SECTION_META[section.id].dot}`}
                />
                {section.label}
                <span className="tabular-nums text-ink-faint">{count}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-pressed={savedOnly}
          onClick={() => {
            const next = !savedOnly;
            setSavedOnly(next);
            if (next) setActiveSection("all");
          }}
          className={`inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-full border px-3.5 text-xs font-medium transition-colors lg:self-auto ${
            savedOnly
              ? "border-accent/40 bg-accent-soft text-accent-strong"
              : "border-line bg-surface text-ink-soft hover:border-accent/30 hover:text-ink"
          }`}
        >
          {savedOnly ? (
            <BookmarkCheck aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Bookmark aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          Saved only
          <span className="tabular-nums text-ink-faint">{savedCount}</span>
        </button>
      </div>

      {sectionsToRender.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface-tint px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-lilac text-accent">
            <Bookmark aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-2xl text-ink">Nothing in this view</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            {savedOnly
              ? "Save an idea and it will wait here for you."
              : "Everything in this section has been set aside. Restore an idea below, or look at another section."}
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => {
              setSavedOnly(false);
              setActiveSection("all");
            }}
          >
            Show all ideas
          </Button>
        </div>
      ) : (
        <div className="space-y-9">
          {sectionsToRender.map((section, sectionIndex) => (
            <section
              key={section.id}
              aria-labelledby={`ideas-${section.id}`}
              className="enter"
              style={{ animationDelay: `${Math.min(sectionIndex * 50, 200)}ms` }}
            >
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${SECTION_META[section.id].dot}`}
                    />
                    <Eyebrow className="text-ink-soft">
                      {section.items.length} {section.items.length === 1 ? "idea" : "ideas"}
                    </Eyebrow>
                  </div>
                  <h2
                    id={`ideas-${section.id}`}
                    className="mt-1 font-display text-[1.7rem] leading-tight tracking-tight text-ink"
                  >
                    {section.label}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {SECTION_META[section.id].blurb}
                  </p>
                </div>
              </div>

              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {section.items.map((entry, index) => {
                  const fit = ideaFit(entry.section, activeEvent, budgetItems);
                  const saved = savedSet.has(entry.key);
                  const inTimeline = timelineTitles.has(entry.title.trim().toLowerCase());

                  return (
                    <li
                      key={entry.key}
                      className="enter"
                      style={{ animationDelay: `${Math.min(index * 45, 180)}ms` }}
                    >
                      <Card className="flex h-full flex-col p-5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={SECTION_META[entry.section].tone}>
                            {entry.sectionLabel}
                          </Badge>
                          {entry.source === "ai" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                              <Sparkles aria-hidden="true" className="h-3 w-3" />
                              Gemini
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                              Curated
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 font-display text-[1.35rem] leading-snug tracking-tight text-ink">
                          {entry.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                          {entry.detail}
                        </p>

                        <dl className="mt-4 space-y-1.5 rounded-xl bg-surface-tint px-3 py-3 text-xs">
                          <div className="flex gap-2">
                            <dt className="w-[5.5rem] shrink-0 font-semibold text-ink-soft">
                              Budget impact
                            </dt>
                            <dd className="min-w-0 flex-1 text-ink-soft">
                              {entry.impact || fit.impact}
                            </dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-[5.5rem] shrink-0 font-semibold text-ink-soft">
                              Why it fits
                            </dt>
                            <dd className="min-w-0 flex-1 text-ink-soft">
                              {entry.why || fit.why}
                            </dd>
                          </div>
                          {entry.source === "ai" &&
                          ((typeof entry.costMin === "number" &&
                            typeof entry.costMax === "number") ||
                            entry.costNote) ? (
                            <div className="flex gap-2">
                              <dt className="w-[5.5rem] shrink-0 font-semibold text-ink-soft">
                                Est. cost
                              </dt>
                              <dd className="min-w-0 flex-1 text-ink-soft">
                                {typeof entry.costMin === "number" &&
                                typeof entry.costMax === "number" ? (
                                  <>
                                    {formatINR(entry.costMin)}–{formatINR(entry.costMax)}
                                    {entry.costNote ? (
                                      <span className="block text-ink-faint">
                                        {entry.costNote}
                                      </span>
                                    ) : null}
                                  </>
                                ) : (
                                  entry.costNote
                                )}
                              </dd>
                            </div>
                          ) : null}
                          {entry.source === "ai" && entry.nextStep ? (
                            <div className="flex gap-2">
                              <dt className="w-[5.5rem] shrink-0 font-semibold text-ink-soft">
                                Next step
                              </dt>
                              <dd className="min-w-0 flex-1 text-ink-soft">{entry.nextStep}</dd>
                            </div>
                          ) : null}
                        </dl>

                        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line pt-3.5">
                          {inTimeline ? (
                            <Badge tone="positive">
                              <Check aria-hidden="true" className="h-3 w-3" /> In timeline
                            </Badge>
                          ) : (
                            <Button
                              variant="secondary"
                              className="h-9 px-3 text-xs"
                              onClick={() => handleAddTask(entry)}
                            >
                              <ListPlus aria-hidden="true" className="h-3.5 w-3.5" />
                              Turn into task
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            aria-pressed={saved}
                            className="h-9 px-3 text-xs"
                            onClick={() => handleSave(entry)}
                          >
                            {saved ? (
                              <BookmarkCheck aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <Bookmark aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            {saved ? "Saved" : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            aria-label={`Dismiss ${entry.title}`}
                            className="ml-auto h-9 px-2.5 text-ink-faint hover:bg-danger-soft hover:text-danger"
                            onClick={() => handleDismiss(entry)}
                          >
                            <X aria-hidden="true" className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {dismissedEntries.length > 0 ? (
        <details className="group rounded-2xl border border-line bg-surface-tint">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
            <Undo2 aria-hidden="true" className="h-4 w-4" />
            Set aside ({dismissedEntries.length})
            <ChevronDown
              aria-hidden="true"
              className="ml-auto h-4 w-4 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {dismissedEntries.map((entry) => (
              <li
                key={entry.key}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    {entry.source === "ai" ? `Gemini · ${entry.sectionLabel}` : entry.sectionLabel}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink">{entry.title}</p>
                </div>
                <Button
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  aria-label={`Restore “${entry.title}”`}
                  onClick={() => handleRestore(entry)}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
