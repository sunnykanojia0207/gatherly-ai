"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Alert,
  Badge,
  Button,
  Card,
  Eyebrow,
  Field,
  Input,
  LoadingPanel,
  NoEventState,
  PageHeader,
  Progress,
  SectionHeading,
} from "@/components/ui";
import { budgetHealth, budgetSummary, type BudgetHealth } from "@/lib/budget";
import { formatINR } from "@/lib/format";
import { categoryColor } from "@/lib/palette";
import type { BudgetItem, VendorRecord } from "@/lib/schema";
import { useGatherly } from "@/lib/store";

const HEALTH_LABEL: Record<BudgetHealth, string> = {
  over: "Over budget",
  tight: "Tight budget",
  healthy: "Healthy budget",
};

const HEALTH_TONE: Record<BudgetHealth, "danger" | "warning" | "positive"> = {
  over: "danger",
  tight: "warning",
  healthy: "positive",
};

const STOP_WORDS = new Set(["and", "the", "for", "with", "extra", "extras"]);

function categoryMatches(vendorCategory: string, itemName: string): boolean {
  const vendorWords = vendorCategory
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  const itemWords = itemName
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  return (
    vendorWords.some((word) => itemName.toLowerCase().includes(word)) ||
    itemWords.some((word) => vendorCategory.toLowerCase().includes(word))
  );
}

function lowestQuote(
  vendors: ReadonlyArray<VendorRecord>,
  itemName: string,
): VendorRecord | null {
  return (
    vendors
      .filter(
        (vendor) => vendor.status !== "declined" && categoryMatches(vendor.category, itemName),
      )
      .sort((a, b) => a.quotedCost - b.quotedCost)[0] ?? null
  );
}

function AllocationRing({
  segments,
  planned,
}: {
  segments: Array<{ id: string; name: string; amount: number; color: string }>;
  planned: number;
}) {
  const size = 184;
  const stroke = 17;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div
      role="img"
      aria-label={
        planned > 0
          ? `Allocation ring for ${formatINR(planned)} planned across ${segments.length} categories`
          : "Allocation ring with no amounts planned"
      }
      className="relative mx-auto h-[184px] w-[184px] shrink-0"
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-lilac)"
          strokeWidth={stroke}
        />
        {planned > 0
          ? segments.map((segment) => {
              const length = (segment.amount / planned) * circumference;
              const visible = Math.max(length - 2.5, 0);
              const circle = (
                <circle
                  key={segment.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${visible} ${circumference}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })
          : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-[1.45rem] leading-tight text-ink">
            {formatINR(planned)}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            planned
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const { state, ready, activeEvent, actions } = useGatherly();
  const [amountErrors, setAmountErrors] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [addErrors, setAddErrors] = useState<{ name?: string; amount?: string }>({});
  const [addStatus, setAddStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);

  if (!ready) return <LoadingPanel label="Loading budget" />;
  if (!activeEvent) {
    return (
      <div>
        <PageHeader
          eyebrow="Budget"
          title="Every rupee, placed with intention"
          description="Plan category by category and see what is left before you book."
        />
        <NoEventState />
      </div>
    );
  }

  const items = state.budgetItems.filter((item) => item.eventId === activeEvent.id);
  const summary = budgetSummary(items, activeEvent.totalBudget);
  const health = budgetHealth(summary);
  const healthTone = HEALTH_TONE[health];
  const progressTone =
    health === "over" ? "danger" : health === "tight" ? "warning" : "positive";
  const vendors = state.vendors.filter((vendor) => vendor.eventId === activeEvent.id);

  const colorByItem = new Map(items.map((item, index) => [item.id, categoryColor(index)]));
  const orderedItems = [...items].sort((a, b) => b.amount - a.amount);
  const segments = orderedItems.map((item) => ({
    id: item.id,
    name: item.name,
    amount: item.amount,
    color: colorByItem.get(item.id) ?? categoryColor(0),
  }));

  const quoteRows = orderedItems
    .map((item) => ({ item, vendor: lowestQuote(vendors, item.name) }))
    .filter((row): row is { item: BudgetItem; vendor: VendorRecord } => row.vendor !== null);

  function handleAmount(item: BudgetItem, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) {
      actions.setBudgetAmount(item.id, 0);
      setAmountErrors((current) => ({ ...current, [item.id]: "" }));
      return;
    }
    const amount = Number(digits);
    if (!Number.isSafeInteger(amount) || amount > 100_000_000) {
      setAmountErrors((current) => ({
        ...current,
        [item.id]: "Keep the amount under ₹10 crore",
      }));
      return;
    }
    setAmountErrors((current) => ({ ...current, [item.id]: "" }));
    actions.setBudgetAmount(item.id, amount);
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newName.trim();
    const amount = newAmount.trim() === "" ? 0 : Number(newAmount.replace(/[^0-9]/g, ""));
    const errors: { name?: string; amount?: string } = {};

    if (!trimmed) errors.name = "Give the category a name";
    else if (trimmed.length > 60) errors.name = "Keep the name under 60 characters";

    if (!Number.isFinite(amount) || amount < 0) errors.amount = "Use a whole rupee amount";
    else if (amount > 100_000_000) errors.amount = "Keep the amount under ₹10 crore";

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      setAddStatus("");
      return;
    }

    const added = actions.addBudgetItem(trimmed, Math.round(amount));
    if (!added) {
      setAddStatus("Could not add the category. Check the name and amount.");
      return;
    }

    setNewName("");
    setNewAmount("");
    setAddErrors({});
    setAddStatus(`Added “${trimmed}”. Adjust its amount above any time.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Budget"
        title="Every rupee, placed with intention"
        description={`Category plan for ${activeEvent.name} · ${formatINR(activeEvent.totalBudget)} total.`}
      >
        <Badge tone={healthTone}>{HEALTH_LABEL[health]}</Badge>
      </PageHeader>

      {health === "over" ? (
        <Alert tone="danger" title="Plan is over budget">
          You have planned {formatINR(-summary.remaining)} more than the total. Trim a category
          before confirming any new bookings.
        </Alert>
      ) : health === "tight" ? (
        <Alert tone="warning" title="Budget is tight">
          {Math.round(summary.utilisation * 100)}% of the total is already planned. Keep a buffer
          for last-minute costs.
        </Alert>
      ) : null}

      <Card className="enter grid gap-8 p-6 sm:p-7 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center">
        <AllocationRing segments={segments} planned={summary.planned} />
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Eyebrow>Financial summary</Eyebrow>
            <LinkToVendors />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-soft">Planned</dt>
              <dd className="mt-1 font-display text-[1.6rem] leading-tight text-ink">
                {formatINR(summary.planned)}
              </dd>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {Math.round(summary.utilisation * 100)}% of total
              </p>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">
                {summary.remaining < 0 ? "Over by" : "Remaining"}
              </dt>
              <dd
                className={`mt-1 font-display text-[1.6rem] leading-tight ${
                  summary.remaining < 0 ? "text-danger" : "text-positive"
                }`}
              >
                {formatINR(Math.abs(summary.remaining))}
              </dd>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {summary.remaining < 0 ? "Reduce category amounts" : "Still to allocate"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs text-ink-soft">Total budget</dt>
              <dd className="mt-1 font-display text-[1.6rem] leading-tight text-ink">
                {formatINR(activeEvent.totalBudget)}
              </dd>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                Set when the event was created
              </p>
            </div>
          </dl>
          <Progress
            className="mt-5"
            value={summary.utilisation * 100}
            label="Overall budget planned"
            tone={progressTone}
          />
          <p className="mt-2 text-xs text-ink-soft">
            {summary.overBudget
              ? "The ring shows where the money is planned; the bar shows pressure on the total."
              : "The ring shows how the plan is composed. Amounts save as you type."}
          </p>
        </div>
      </Card>

      <Card className="enter overflow-hidden" style={{ animationDelay: "60ms" }}>
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <SectionHeading
            kicker="Categories"
            title="Where the plan lives"
            description="Each amount saves as you type."
          />
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">
            No categories yet. Add the first one below.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {orderedItems.map((item) => {
              const share =
                activeEvent.totalBudget > 0 ? (item.amount / activeEvent.totalBudget) * 100 : 0;
              const error = amountErrors[item.id];
              const color = colorByItem.get(item.id) ?? categoryColor(0);
              return (
                <li
                  key={item.id}
                  className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_170px_44px] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-soft">
                        {Math.round(share)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lilac">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, share))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`amount-${item.id}`} className="sr-only">
                      Amount for {item.name}
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint"
                      >
                        ₹
                      </span>
                      <Input
                        id={`amount-${item.id}`}
                        type="text"
                        inputMode="numeric"
                        value={String(item.amount)}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => handleAmount(item, event.target.value)}
                        aria-invalid={Boolean(error) || undefined}
                        aria-describedby={error ? `amount-${item.id}-error` : undefined}
                        className="pl-7 text-right tabular-nums"
                      />
                    </div>
                    {error ? (
                      <p
                        id={`amount-${item.id}-error`}
                        className="mt-1 text-xs font-medium text-danger"
                      >
                        {error}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Delete ${item.name} category`}
                    className="justify-self-start px-2 text-ink-faint hover:bg-danger-soft hover:text-danger sm:justify-self-end"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-line bg-surface-tint px-5 py-5 sm:px-6">
          <form
            onSubmit={handleAdd}
            noValidate
            className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-start"
          >
            <Field label="New category" htmlFor="new-category" error={addErrors.name}>
              <Input
                id="new-category"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Décor extras"
                aria-invalid={Boolean(addErrors.name) || undefined}
                aria-describedby={addErrors.name ? "new-category-error" : undefined}
              />
            </Field>
            <Field label="Amount (₹)" htmlFor="new-amount" error={addErrors.amount}>
              <Input
                id="new-amount"
                type="text"
                inputMode="numeric"
                value={newAmount}
                onChange={(event) => setNewAmount(event.target.value)}
                placeholder="0"
                aria-invalid={Boolean(addErrors.amount) || undefined}
                aria-describedby={addErrors.amount ? "new-amount-error" : undefined}
                className="text-right tabular-nums"
              />
            </Field>
            <div className="sm:pt-[26px]">
              <Button type="submit" variant="secondary">
                <Plus aria-hidden="true" className="h-4 w-4" /> Add category
              </Button>
            </div>
          </form>
          {addStatus ? (
            <p role="status" className="mt-2 text-xs text-ink-soft">
              {addStatus}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="enter p-6 sm:p-7" style={{ animationDelay: "100ms" }}>
        <SectionHeading
          kicker="Vendors"
          title="Quote against the plan"
          description="Lowest active quote per matching category. Declined vendors are excluded."
        />
        {quoteRows.length === 0 ? (
          <p className="mt-4 rounded-xl bg-surface-tint px-4 py-6 text-center text-sm text-ink-soft">
            No vendor quotes match these categories yet. Add vendors with a matching category to
            compare quotes here.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {quoteRows.map(({ item, vendor }) => {
              const difference = vendor.quotedCost - item.amount;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{vendor.name}</p>
                    <p className="text-xs text-ink-soft">
                      Matches “{item.name}” · {formatINR(item.amount)} planned
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {formatINR(vendor.quotedCost)}
                    </p>
                    <p
                      className={`text-xs ${
                        difference > 0 ? "text-warning" : "text-positive"
                      }`}
                    >
                      {difference === 0
                        ? "Exactly on plan"
                        : difference > 0
                          ? `${formatINR(difference)} over the plan`
                          : `${formatINR(-difference)} under the plan`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.name ?? "this category"}”?`}
        description={
          deleteTarget
            ? `${formatINR(deleteTarget.amount)} will be removed from this event’s plan. Other events are untouched.`
            : ""
        }
        confirmLabel="Delete category"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) actions.deleteBudgetItem(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function LinkToVendors() {
  return (
    <Link
      href="/vendors"
      className="text-xs font-medium text-accent hover:text-accent-strong"
    >
      Compare vendor quotes →
    </Link>
  );
}
