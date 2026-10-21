"use client";

import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AlertTriangle, ArrowRight, CalendarDays } from "lucide-react";

import { useGatherly } from "@/lib/store";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse";

const BUTTON_BASE =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[0_10px_22px_-14px_rgba(87,46,153,0.9)] hover:bg-accent-strong",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-accent/30 hover:bg-accent-soft/60",
  ghost: "text-ink-soft hover:bg-lilac hover:text-ink",
  danger: "border border-danger/25 bg-danger-soft text-danger hover:bg-danger/12",
  inverse: "bg-on-dark text-plum hover:bg-white",
};

export function buttonClass(variant: ButtonVariant = "primary", className = ""): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`.trim();
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

const CONTROL =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/12 disabled:opacity-60";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} h-11 ${className}`.trim()} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL} h-11 ${className}`.trim()} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} min-h-24 py-2.5 ${className}`.trim()} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section style={style} className={`card-surface rounded-2xl ${className}`.trim()}>
      {children}
    </section>
  );
}

export function Eyebrow({
  children,
  className = "text-ink-faint",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`.trim()}
    >
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="enter mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="mb-3 flex items-center gap-2.5">
            <span aria-hidden="true" className="h-px w-7 bg-orchid" />
            <Eyebrow className="text-accent">{eyebrow}</Eyebrow>
          </div>
        ) : null}
        <h1 className="font-display text-[2rem] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[2.75rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
          {description}
        </p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

export function SectionHeading({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <Eyebrow className="text-accent">{kicker}</Eyebrow> : null}
        <h2 className="mt-1 font-display text-2xl tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type BadgeTone =
  | "neutral"
  | "accent"
  | "positive"
  | "warning"
  | "danger"
  | "plum"
  | "blush"
  | "champagne"
  | "sage"
  | "orchid";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-lilac/70 text-ink-soft",
  accent: "border-accent/20 bg-accent-soft text-accent",
  positive: "border-positive/20 bg-positive-soft text-positive",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
  plum: "border-plum/15 bg-plum text-on-dark",
  blush: "border-blush-deep/20 bg-[#fdeeea] text-blush-deep",
  champagne: "border-champagne-deep/20 bg-[#fbf3e2] text-champagne-deep",
  sage: "border-sage-deep/20 bg-[#eaf5ee] text-sage-deep",
  orchid: "border-orchid/40 bg-orchid-soft text-accent-strong",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em] ${BADGE_TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

const PROGRESS_TONES = {
  accent: "bg-accent",
  orchid: "bg-orchid",
  positive: "bg-positive",
  warning: "bg-[#d2a64a]",
  danger: "bg-danger",
} as const;

export function Progress({
  value,
  label,
  tone = "accent",
  className = "",
}: {
  value: number;
  label: string;
  tone?: keyof typeof PROGRESS_TONES;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={`h-2 w-full overflow-hidden rounded-full bg-lilac ${className}`.trim()}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${PROGRESS_TONES[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Alert({
  tone = "warning",
  title,
  children,
}: {
  tone?: "warning" | "danger" | "positive";
  title: string;
  children: ReactNode;
}) {
  const tones = {
    warning: "border-warning/25 bg-warning-soft text-warning",
    danger: "border-danger/25 bg-danger-soft text-danger",
    positive: "border-positive/25 bg-positive-soft text-positive",
  };
  return (
    <div role="status" className={`flex gap-3 rounded-xl border p-4 text-sm ${tones[tone]}`}>
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 text-ink-soft">{children}</div>
      </div>
    </div>
  );
}

export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div aria-busy="true" className="space-y-4">
      <p role="status" className="sr-only">
        {label}…
      </p>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-lilac" />
      <div className="h-36 animate-pulse rounded-2xl bg-lilac" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse rounded-2xl bg-lilac" />
        <div className="h-28 animate-pulse rounded-2xl bg-lilac" />
        <div className="h-28 animate-pulse rounded-2xl bg-lilac" />
      </div>
    </div>
  );
}

export function NoEventState({
  title = "No event selected",
  description = "Choose an event from My Events, create a new one, or explore the demo wedding to see how Gatherly works.",
}: {
  title?: string;
  description?: string;
}) {
  const { actions } = useGatherly();
  return (
    <Card className="enter mx-auto max-w-xl p-8 text-center sm:p-10">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-plum text-on-dark">
        <CalendarDays aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-5 font-display text-3xl tracking-tight text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/events" className={buttonClass("primary")}>
          Go to My Events <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Button variant="secondary" onClick={actions.loadDemo}>
          Explore demo event
        </Button>
      </div>
    </Card>
  );
}

export function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface-tint px-6 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-lilac text-accent">
        {icon}
      </span>
      <p className="mt-3 font-display text-xl text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
