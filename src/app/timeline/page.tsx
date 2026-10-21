"use client";

import { CalendarClock, Check, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Badge,
  Button,
  Card,
  EmptyBlock,
  Eyebrow,
  Field,
  Input,
  LoadingPanel,
  NoEventState,
  PageHeader,
  Progress,
  SectionHeading,
  Select,
} from "@/components/ui";
import { countdownLabel, daysUntil, formatDate, todayISO } from "@/lib/format";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_TONES,
  type TaskPriority,
} from "@/lib/labels";
import {
  fieldErrors,
  taskInputSchema,
  type TaskRecord,
} from "@/lib/schema";
import { useGatherly } from "@/lib/store";
import { isOverdue, taskProgress, upcomingTasks } from "@/lib/timeline";

function TaskItem({
  task,
  today,
  index,
  onRequestDelete,
}: {
  task: TaskRecord;
  today: string;
  index: number;
  onRequestDelete: (task: TaskRecord) => void;
}) {
  const { actions } = useGatherly();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDue, setEditDue] = useState(task.dueDate);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const overdue = isOverdue(task, today);

  function startEdit() {
    setEditTitle(task.title);
    setEditDue(task.dueDate);
    setEditPriority(task.priority);
    setEditErrors({});
    setEditing(true);
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = taskInputSchema.safeParse({
      title: editTitle,
      dueDate: editDue,
      priority: editPriority,
    });
    if (!parsed.success) {
      setEditErrors(fieldErrors(parsed.error));
      return;
    }
    actions.updateTask(task.id, parsed.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="py-3">
        <form
          onSubmit={handleSave}
          noValidate
          className="rounded-xl border border-accent/25 bg-surface-tint p-3.5"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_165px_140px]">
            <Field label="Task" htmlFor={`edit-title-${task.id}`} error={editErrors.title}>
              <Input
                id={`edit-title-${task.id}`}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                autoFocus
                aria-invalid={Boolean(editErrors.title) || undefined}
                aria-describedby={editErrors.title ? `edit-title-${task.id}-error` : undefined}
              />
            </Field>
            <Field label="Due date" htmlFor={`edit-due-${task.id}`} error={editErrors.dueDate}>
              <Input
                id={`edit-due-${task.id}`}
                type="date"
                value={editDue}
                onChange={(event) => setEditDue(event.target.value)}
                aria-invalid={Boolean(editErrors.dueDate) || undefined}
                aria-describedby={editErrors.dueDate ? `edit-due-${task.id}-error` : undefined}
              />
            </Field>
            <Field label="Priority" htmlFor={`edit-priority-${task.id}`}>
              <Select
                id={`edit-priority-${task.id}`}
                value={editPriority}
                onChange={(event) => setEditPriority(event.target.value as TaskPriority)}
              >
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="submit">Save changes</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className="enter relative flex items-start gap-3 py-3"
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      <span className="relative z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => actions.updateTask(task.id, { done: !task.done })}
          aria-label={`Mark ${task.title} as ${task.done ? "not done" : "done"}`}
          className="h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-line-strong bg-surface transition-colors checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <Check
          aria-hidden="true"
          className={`pointer-events-none absolute h-3 w-3 text-white ${
            task.done ? "check-draw" : "opacity-0"
          }`}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={`text-sm font-medium ${
              task.done ? "text-ink-soft line-through decoration-line-strong" : "text-ink"
            }`}
          >
            {task.title}
          </p>
          <Badge tone={TASK_PRIORITY_TONES[task.priority]}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
          {overdue ? <Badge tone="danger">Overdue</Badge> : null}
        </div>
        <p className={`mt-0.5 text-xs ${overdue ? "font-medium text-danger" : "text-ink-soft"}`}>
          {task.done ? "Completed · due " : overdue ? "Was due " : "Due "}
          {formatDate(task.dueDate)}
        </p>
      </div>

      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          onClick={startEdit}
          aria-label={`Edit ${task.title}`}
          className="px-2 text-ink-faint hover:text-accent"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => onRequestDelete(task)}
          aria-label={`Delete ${task.title}`}
          className="px-2 text-ink-faint hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

export default function TimelinePage() {
  const { state, ready, activeEvent, actions } = useGatherly();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TaskRecord | null>(null);

  if (!ready) return <LoadingPanel label="Loading timeline" />;
  if (!activeEvent) {
    return (
      <div>
        <PageHeader
          eyebrow="Timeline"
          title="A sequence you can trust"
          description="Sequence the decisions that make the event feel calm, not rushed."
        />
        <NoEventState />
      </div>
    );
  }

  const today = todayISO();
  const tasks = state.tasks.filter((task) => task.eventId === activeEvent.id);
  const progress = taskProgress(tasks);
  const openTasks = upcomingTasks(tasks, Number.POSITIVE_INFINITY);
  const completedTasks = tasks
    .filter((task) => task.done)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const overdueCount = tasks.filter((task) => isOverdue(task, today)).length;
  const nextTask = upcomingTasks(tasks, 1)[0];

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = taskInputSchema.safeParse({ title, dueDate, priority });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setStatus("Please fix the highlighted fields.");
      return;
    }
    actions.addTask(parsed.data);
    setTitle("");
    setDueDate("");
    setErrors({});
    setStatus("Task added to the timeline.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Timeline"
        title="The run-up, in order"
        description={`Every task and deadline for ${activeEvent.name}, sorted by what needs attention first.`}
      >
        {overdueCount > 0 ? <Badge tone="danger">{overdueCount} overdue</Badge> : null}
        <Button
          onClick={() => setShowAdd((open) => !open)}
          aria-expanded={showAdd}
          aria-controls="add-task-panel"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {showAdd ? "Close form" : "Add decision"}
        </Button>
      </PageHeader>

      {showAdd ? (
        <div id="add-task-panel" className="enter">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-xl text-ink">Add a task</h2>
            <form
              onSubmit={handleAdd}
              noValidate
              className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px_150px_auto] sm:items-start"
            >
              <Field label="Task" htmlFor="task-title" error={errors.title}>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Confirm the photographer"
                  aria-invalid={Boolean(errors.title) || undefined}
                  aria-describedby={errors.title ? "task-title-error" : undefined}
                />
              </Field>
              <Field label="Due date" htmlFor="task-due" error={errors.dueDate}>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-invalid={Boolean(errors.dueDate) || undefined}
                  aria-describedby={errors.dueDate ? "task-due-error" : undefined}
                />
              </Field>
              <Field label="Priority" htmlFor="task-priority">
                <Select
                  id="task-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                >
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:pt-[26px]">
                <Button type="submit">
                  <Plus aria-hidden="true" className="h-4 w-4" /> Add task
                </Button>
              </div>
            </form>
            {status ? (
              <p role="status" className="mt-3 text-xs text-ink-soft">
                {status}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {nextTask ? (
        <section
          aria-labelledby="next-milestone"
          className="hero-plum enter relative overflow-hidden rounded-2xl px-5 py-5 text-on-dark sm:px-7 sm:py-6"
        >
          <CalendarClock
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 text-orchid/25"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <Eyebrow className="text-orchid">Next milestone</Eyebrow>
              <h2
                id="next-milestone"
                className="mt-1.5 max-w-xl font-display text-2xl leading-tight sm:text-[1.75rem]"
              >
                {nextTask.title}
              </h2>
              <p className="mt-1.5 text-sm text-on-dark-soft">
                Due {formatDate(nextTask.dueDate)} · {TASK_PRIORITY_LABELS[nextTask.priority]}{" "}
                priority
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-on-dark/15 bg-on-dark/5 px-4 py-3 text-right">
              <p className="font-display text-2xl text-champagne">
                {countdownLabel(daysUntil(nextTask.dueDate, today))}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-dark-faint">
                Focus next
              </p>
            </div>
          </div>
        </section>
      ) : tasks.length > 0 ? (
        <div className="rounded-2xl border border-positive/25 bg-positive-soft px-5 py-4 text-sm text-positive">
          Every task is complete. Keep the list clear until the next decision is real.
        </div>
      ) : null}

      <Card className="enter overflow-hidden" style={{ animationDelay: "70ms" }}>
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <SectionHeading
            kicker="Plan"
            title="All decisions"
            description={`${progress.done} of ${progress.total} complete${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
          />
          <Progress
            className="mt-4"
            value={progress.percent}
            label="Task completion"
            tone={progress.percent === 100 && progress.total > 0 ? "positive" : "accent"}
          />
        </div>

        {tasks.length === 0 ? (
          <div className="p-5">
            <EmptyBlock
              icon={<ListChecks aria-hidden="true" className="h-5 w-5" />}
              title="No tasks yet"
              description="Add the next decision above. A short list you trust beats a long list you avoid."
              action={
                <Button variant="secondary" onClick={() => setShowAdd(true)}>
                  <Plus aria-hidden="true" className="h-4 w-4" /> Add the first task
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {openTasks.length > 0 ? (
              <section aria-labelledby="open-tasks" className="px-5 py-4 sm:px-6">
                <h3
                  id="open-tasks"
                  className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint"
                >
                  Open · {openTasks.length}
                </h3>
                <ol className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-4 left-[9px] top-4 w-px bg-line"
                  />
                  {openTasks.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      today={today}
                      index={index}
                      onRequestDelete={setDeleteTarget}
                    />
                  ))}
                </ol>
              </section>
            ) : null}

            {completedTasks.length > 0 ? (
              <section
                aria-labelledby="completed-tasks"
                className="border-t border-line bg-surface-tint/60 px-5 py-4 sm:px-6"
              >
                <h3
                  id="completed-tasks"
                  className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint"
                >
                  Completed · {completedTasks.length}
                </h3>
                <ol className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-4 left-[9px] top-4 w-px bg-line"
                  />
                  {completedTasks.map((task, index) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      today={today}
                      index={index}
                      onRequestDelete={setDeleteTarget}
                    />
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.title ?? "this task"}”?`}
        description="The decision is removed from this event’s timeline. Other events are untouched."
        confirmLabel="Delete task"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) actions.deleteTask(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
