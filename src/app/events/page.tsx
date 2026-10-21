"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Plus,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { EventForm } from "@/components/event-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EventMotif } from "@/components/motifs";
import {
  Badge,
  Button,
  Card,
  EmptyBlock,
  LoadingPanel,
  PageHeader,
  Progress,
  buttonClass,
} from "@/components/ui";
import { budgetHealth, budgetSummary } from "@/lib/budget";
import { countdownLabel, daysUntil, formatDate, formatINR, todayISO } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import type { EventRecord } from "@/lib/schema";
import { DEMO_EVENT_ID } from "@/lib/seed";
import { useGatherly } from "@/lib/store";
import { taskProgress } from "@/lib/timeline";

export default function EventsPage() {
  const { state, ready, actions } = useGatherly();
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRecord | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!ready) return <LoadingPanel label="Loading events" />;

  const demoExists = state.events.some((event) => event.id === DEMO_EVENT_ID);
  const orderedEvents = [...state.events].sort(
    (a, b) => Number(b.id === state.activeEventId) - Number(a.id === state.activeEventId),
  );
  const today = todayISO();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Events"
        title="My Events"
        description="Create an event, switch the active one, or explore the demo wedding. Everything is saved in this browser."
      >
        <Button
          onClick={() => setShowForm((open) => !open)}
          aria-expanded={showForm}
          aria-controls="event-form-panel"
        >
          {showForm ? (
            <>
              <X aria-hidden="true" className="h-4 w-4" /> Close wizard
            </>
          ) : (
            <>
              <Plus aria-hidden="true" className="h-4 w-4" /> New event
            </>
          )}
        </Button>
        {demoExists ? (
          <Button variant="ghost" onClick={() => setResetOpen(true)}>
            Reset demo
          </Button>
        ) : (
          <Button variant="secondary" onClick={actions.loadDemo}>
            Load demo event
          </Button>
        )}
      </PageHeader>

      {showForm ? (
        <div id="event-form-panel" className="enter">
          <Card className="overflow-hidden p-0">
            <EventForm onCancel={() => setShowForm(false)} />
          </Card>
        </div>
      ) : null}

      {state.events.length === 0 ? (
        <EmptyBlock
          icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
          title="No events yet"
          description="Create your first event, or load the demo wedding to see budgets, timelines, and vendor tracking in action."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setShowForm(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" /> New event
              </Button>
              <Button variant="secondary" onClick={actions.loadDemo}>
                Explore demo event
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {orderedEvents.map((event) => {
            const isActive = event.id === state.activeEventId;
            const eventItems = state.budgetItems.filter((item) => item.eventId === event.id);
            const summary = budgetSummary(eventItems, event.totalBudget);
            const health = budgetHealth(summary);
            const progress = taskProgress(
              state.tasks.filter((task) => task.eventId === event.id),
            );
            const isDemo = event.id === DEMO_EVENT_ID;
            const days = daysUntil(event.date, today);

            return (
              <li key={event.id}>
                <Card
                  className={`flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-lift ${
                    isActive ? "border-accent/40 ring-1 ring-accent/15" : ""
                  }`}
                >
                  <div
                    className={`relative h-24 overflow-hidden ${
                      isActive ? "plum-texture" : "bg-lilac/70"
                    }`}
                  >
                    <EventMotif
                      type={event.type}
                      className={`absolute -bottom-7 right-1 h-32 w-48 ${
                        isActive ? "text-orchid/80" : "text-accent/30"
                      }`}
                    />
                    <div className="relative flex items-center justify-between gap-2 p-4">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          isActive ? "text-orchid" : "text-accent"
                        }`}
                      >
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                      <span
                        className={`text-[11px] ${
                          isActive ? "text-on-dark-soft" : "text-ink-soft"
                        }`}
                      >
                        {countdownLabel(days)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isActive ? <Badge tone="accent">Active</Badge> : null}
                      {isDemo ? <Badge tone="neutral">Demo</Badge> : null}
                      <Badge
                        tone={
                          health === "over" ? "danger" : health === "tight" ? "warning" : "positive"
                        }
                      >
                        {health === "over"
                          ? "Over budget"
                          : health === "tight"
                            ? "Tight budget"
                            : "Healthy budget"}
                      </Badge>
                    </div>

                    <h2 className="mt-3 font-display text-2xl leading-tight tracking-tight text-ink">
                      {event.name}
                    </h2>

                    <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                      <li className="flex items-center gap-2">
                        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-faint" />
                        {formatDate(event.date)}
                      </li>
                      <li className="flex items-center gap-2">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-faint" />
                        {event.location}
                      </li>
                      <li className="flex items-center gap-2">
                        <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-faint" />
                        {event.guests} guests
                      </li>
                    </ul>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
                      <div>
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                          <Wallet aria-hidden="true" className="h-3 w-3" /> Budget
                        </p>
                        <p className="mt-1 text-sm font-medium text-ink">
                          {formatINR(summary.planned)}
                        </p>
                        <p className="text-[11px] text-ink-soft">of {formatINR(event.totalBudget)}</p>
                        <Progress
                          className="mt-2"
                          value={summary.utilisation * 100}
                          label={`${event.name} budget planned`}
                          tone={
                            health === "over" ? "danger" : health === "tight" ? "warning" : "positive"
                          }
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                          Tasks
                        </p>
                        <p className="mt-1 text-sm font-medium text-ink">
                          {progress.done} of {progress.total}
                        </p>
                        <p className="text-[11px] text-ink-soft">{progress.percent}% complete</p>
                        <Progress
                          className="mt-2"
                          value={progress.percent}
                          label={`${event.name} task progress`}
                        />
                      </div>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-5">
                      {isActive ? (
                        <Link href="/" className={buttonClass("secondary", "flex-1")}>
                          Open overview <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Button className="flex-1" onClick={() => actions.selectEvent(event.id)}>
                          Make active
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteTarget(event)}
                        aria-label={`Delete ${event.name}`}
                        className="w-10 px-0 text-ink-faint hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.name ?? "this event"}”?`}
        description="Its budget categories, tasks, and vendors are removed too. Other events stay untouched. This cannot be undone."
        confirmLabel="Delete event"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) actions.deleteEvent(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Replace the demo wedding?"
        description="Fresh sample budget, tasks, and vendors replace the current demo data. Your other events are kept."
        confirmLabel="Reset demo"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          actions.resetDemo();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
