"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Circle,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";

import { budgetHealth, budgetSummary } from "@/lib/budget";
import { daysUntil, formatDate, formatDateShort, formatINR, todayISO } from "@/lib/format";
import { SAMPLE_IDEAS, ideaFit } from "@/lib/ideas";
import { buildNextMoves, type InsightTone } from "@/lib/insights";
import { EVENT_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_PRIORITY_TONES } from "@/lib/labels";
import { categoryColor } from "@/lib/palette";
import { useGatherly } from "@/lib/store";
import { isOverdue, taskProgress, upcomingTasks } from "@/lib/timeline";
import { HeroOrnament } from "@/components/motifs";
import {
  Badge,
  Card,
  Eyebrow,
  LoadingPanel,
  NoEventState,
  PageHeader,
  Progress,
  SectionHeading,
  buttonClass,
} from "@/components/ui";

const INSIGHT_DOTS: Record<InsightTone, string> = {
  danger: "bg-danger",
  warning: "bg-[#c9a24a]",
  accent: "bg-orchid",
  positive: "bg-positive",
};

export default function OverviewPage() {
  const { state, ready, activeEvent } = useGatherly();

  if (!ready) return <LoadingPanel label="Loading your events" />;
  if (!activeEvent) {
    return (
      <div>
        <PageHeader
          eyebrow="Overview"
          title="A calmer way to gather"
          description="A calm read on budgets, timelines, and the next decision for your event."
        />
        <NoEventState />
      </div>
    );
  }

  const today = todayISO();
  const items = state.budgetItems.filter((item) => item.eventId === activeEvent.id);
  const tasks = state.tasks.filter((task) => task.eventId === activeEvent.id);
  const vendors = state.vendors.filter((vendor) => vendor.eventId === activeEvent.id);

  const summary = budgetSummary(items, activeEvent.totalBudget);
  const health = budgetHealth(summary);
  const progress = taskProgress(tasks);
  const upcoming = upcomingTasks(tasks, 4);
  const days = daysUntil(activeEvent.date, today);
  const bookedVendors = vendors.filter((vendor) => vendor.status === "booked").length;
  const featured = SAMPLE_IDEAS[activeEvent.type].themes[0];
  const featuredFit = ideaFit("themes", activeEvent, items);
  const moves = buildNextMoves({ event: activeEvent, budgetItems: items, tasks, vendors, today });

  const colorByItem = new Map(items.map((item, index) => [item.id, categoryColor(index)]));
  const topCategories = [...items].sort((a, b) => b.amount - a.amount).slice(0, 3);
  const restAmount = items
    .filter((item) => !topCategories.some((top) => top.id === item.id))
    .reduce((sum, item) => sum + item.amount, 0);
  const segments = [
    ...topCategories.map((item) => ({
      name: item.name,
      amount: item.amount,
      color: colorByItem.get(item.id) ?? categoryColor(0),
    })),
    ...(restAmount > 0
      ? [{ name: "Everything else", amount: restAmount, color: "var(--color-line-strong)" }]
      : []),
  ];

  const healthTone = health === "over" ? "danger" : health === "tight" ? "warning" : "positive";
  const healthLabel =
    health === "over" ? "Over budget" : health === "tight" ? "Tight budget" : "Healthy budget";

  const countdownValue = days === 0 ? "Today" : Math.abs(days);
  const countdownLabel =
    days > 0 ? "days to go" : days < 0 ? "days since the date" : "the day is here";

  return (
    <div className="space-y-8 lg:space-y-10">
      <PageHeader
        eyebrow="Overview"
        title="The celebration, in one calm view"
        description={`A calm read on ${activeEvent.name} — what is decided, what it costs, and what needs you next.`}
      >
        <Link href="/budget" className={buttonClass("secondary")}>
          Review budget
        </Link>
        <Link href="/timeline" className={buttonClass("primary")}>
          Open timeline <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </PageHeader>

      <section
        aria-labelledby="event-title"
        className="hero-plum enter relative overflow-hidden rounded-3xl px-6 py-7 text-on-dark shadow-lift sm:px-9 sm:py-9"
      >
        <HeroOrnament className="pointer-events-none absolute -right-24 -top-24 h-[460px] w-[560px] text-orchid opacity-60" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            {activeEvent.theme ? (
              <p className="max-w-xl border-l border-champagne/60 pl-3 text-sm leading-relaxed text-on-dark-soft">
                {activeEvent.theme}
              </p>
            ) : null}
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-orchid">
              Active event · {EVENT_TYPE_LABELS[activeEvent.type]}
            </p>
            <h2
              id="event-title"
              className="mt-2 max-w-2xl font-display text-[2.15rem] leading-[1.04] tracking-[-0.01em] sm:text-[3rem]"
            >
              {activeEvent.name}
            </h2>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-dark-soft">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-on-dark-faint" />
                {formatDate(activeEvent.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="h-4 w-4 text-on-dark-faint" />
                {activeEvent.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users aria-hidden="true" className="h-4 w-4 text-on-dark-faint" />
                {activeEvent.guests} guests
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/timeline" className={buttonClass("inverse")}>
                Open timeline <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/vendors"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-on-dark/25 px-4 text-sm font-medium text-on-dark transition-colors hover:bg-on-dark/10"
              >
                Vendor checklist
              </Link>
            </div>
          </div>
          <div className="shrink-0 lg:pb-1 lg:text-right">
            <p className="font-display text-[3.5rem] leading-none text-champagne sm:text-[4.5rem]">
              {countdownValue}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-dark-faint">
              {countdownLabel}
            </p>
            <p className="mt-4 text-xs text-on-dark-soft">{formatDate(activeEvent.date)}</p>
          </div>
        </div>
      </section>

      <section
        aria-label="Event snapshot"
        className="enter"
        style={{ animationDelay: "70ms" }}
      >
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
          <div className="flex flex-col bg-surface p-5 sm:p-6">
            <Eyebrow>Budget planned</Eyebrow>
            <p className="mt-2 font-display text-[1.6rem] leading-tight text-ink">
              {formatINR(summary.planned)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">of {formatINR(activeEvent.totalBudget)}</p>
            <Progress
              className="mt-3"
              value={summary.utilisation * 100}
              label="Share of budget planned"
              tone={healthTone}
            />
            <p className="mt-auto pt-2 text-xs font-medium text-ink-soft">{healthLabel}</p>
          </div>

          <div className="flex flex-col bg-surface p-5 sm:p-6">
            <Eyebrow>Tasks complete</Eyebrow>
            <p className="mt-2 font-display text-[1.6rem] leading-tight text-ink">
              {progress.done} of {progress.total}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {progress.total === 0 ? "No tasks yet" : `${progress.percent}% of the plan`}
            </p>
            <Progress className="mt-3" value={progress.percent} label="Tasks complete" />
            <p className="mt-auto pt-2 text-xs font-medium text-ink-soft">
              {progress.total - progress.done} open
            </p>
          </div>

          <div className="flex flex-col bg-surface p-5 sm:p-6">
            <Eyebrow>Vendors booked</Eyebrow>
            <p className="mt-2 font-display text-[1.6rem] leading-tight text-ink">
              {bookedVendors} of {vendors.length}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {vendors.length === 0 ? "No vendors tracked" : "Confirmed suppliers"}
            </p>
            <Progress
              className="mt-3"
              value={vendors.length === 0 ? 0 : (bookedVendors / vendors.length) * 100}
              label="Vendors booked"
              tone="positive"
            />
            <p className="mt-auto pt-2 text-xs font-medium text-ink-soft">
              {vendors.length - bookedVendors} still to confirm
            </p>
          </div>

          <div className="flex flex-col bg-surface p-5 sm:p-6">
            <Eyebrow>Guests in the plan</Eyebrow>
            <p className="mt-2 font-display text-[1.6rem] leading-tight text-ink">
              {activeEvent.guests}
            </p>
            <p className="mt-1 truncate text-xs text-ink-soft">{activeEvent.location}</p>
            <div className="mt-3">
              <Badge tone="accent">{EVENT_TYPE_LABELS[activeEvent.type]}</Badge>
            </div>
            <p className="mt-auto pt-2 text-xs font-medium text-ink-soft">
              Headcount typically firms up two weeks out
            </p>
          </div>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="enter min-w-0 flex flex-col p-6 sm:p-7" style={{ animationDelay: "120ms" }}>
          <SectionHeading
            kicker="Timeline"
            title="Next decisions"
            action={
              <Link
                href="/timeline"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
              >
                View timeline <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <div className="mt-5 rounded-xl bg-surface-tint px-4 py-9 text-center">
              <p className="font-display text-xl text-ink">Nothing open</p>
              <p className="mt-1 text-sm text-ink-soft">
                Add the next decision when it matters — the timeline stays quiet until then.
              </p>
            </div>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {upcoming.map((task) => {
                const overdue = isOverdue(task, today);
                return (
                  <li key={task.id}>
                    <Link
                      href="/timeline"
                      className="group flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors hover:bg-lilac/50"
                    >
                      <span
                        aria-hidden="true"
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                          overdue ? "bg-danger-soft text-danger" : "bg-lilac text-accent"
                        }`}
                      >
                        <Circle className="h-4 w-4" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {task.title}
                        </span>
                        <span
                          className={`mt-0.5 block text-xs ${
                            overdue ? "font-medium text-danger" : "text-ink-soft"
                          }`}
                        >
                          {overdue ? "Overdue · " : "Due "}
                          {formatDateShort(task.dueDate)}
                        </span>
                      </span>
                      <Badge tone={TASK_PRIORITY_TONES[task.priority]}>
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </Badge>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="hidden h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-accent sm:block"
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-auto pt-4 text-xs text-ink-faint">
            {progress.total - progress.done} open of {progress.total} decisions ·{" "}
            {formatDate(activeEvent.date)}
          </p>
        </Card>

        <Card className="enter min-w-0 flex flex-col p-6 sm:p-7" style={{ animationDelay: "160ms" }}>
          <SectionHeading
            kicker="Decision desk"
            title="Your next moves"
            description="Derived from your saved plan, not guesswork."
          />
          <ol className="mt-5 space-y-2.5">
            {moves.map((move) => (
              <li key={move.id}>
                <Link
                  href={move.href}
                  className="group block rounded-xl border border-line bg-surface-tint p-4 transition-[border-color,background-color] hover:border-accent/30 hover:bg-accent-soft/40"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${INSIGHT_DOTS[move.tone]}`}
                    />
                    <Eyebrow>{move.kicker}</Eyebrow>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="ml-auto h-4 w-4 text-ink-faint transition-colors group-hover:text-accent"
                    />
                  </span>
                  <span className="mt-2 block text-sm font-semibold text-ink">{move.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                    {move.detail}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="enter min-w-0 p-6 sm:p-7" style={{ animationDelay: "200ms" }}>
          <SectionHeading
            kicker="Budget"
            title="Where the plan is invested"
            action={
              <Link
                href="/budget"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
              >
                Open budget <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            }
          />
          <div
            aria-hidden="true"
            className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-lilac"
          >
            {segments.map((segment) => (
              <span
                key={segment.name}
                style={{
                  width: `${summary.planned > 0 ? (segment.amount / summary.planned) * 100 : 0}%`,
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </div>
          <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {segments.map((segment) => (
              <li key={segment.name} className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="truncate">{segment.name}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-ink-soft">
                  {formatINR(segment.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl bg-lilac/60 px-4 py-3 text-xs text-ink-soft">
            {summary.overBudget
              ? `Planned ${formatINR(-summary.remaining)} beyond the total budget.`
              : summary.remaining === 0
                ? `Every rupee of the ${formatINR(activeEvent.totalBudget)} budget is allocated.`
                : `${formatINR(summary.remaining)} still unallocated of ${formatINR(activeEvent.totalBudget)}.`}
          </p>
        </Card>

        <Card
          className="enter relative min-w-0 overflow-hidden border-champagne-deep/15 bg-[#fdf8ee] p-6 sm:p-7"
          style={{ animationDelay: "240ms" }}
        >
          <span
            aria-hidden="true"
            className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blush/25"
          />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="champagne">
                <Sparkles aria-hidden="true" className="h-3 w-3" /> Curated idea
              </Badge>
              <Link
                href="/ideas"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
              >
                More ideas <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            <h2 className="mt-4 font-display text-[1.65rem] leading-tight text-ink">
              {featured.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{featured.detail}</p>
            <dl className="mt-4 space-y-2 border-t border-champagne-deep/15 pt-4 text-xs">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-champagne-deep">Budget impact</dt>
                <dd className="text-ink-soft">{featuredFit.impact}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-champagne-deep">Why it fits</dt>
                <dd className="text-ink-soft">{featuredFit.why}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[11px] text-ink-faint">
              Curated sample content. Generate event-specific ideas on AI Ideas.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
