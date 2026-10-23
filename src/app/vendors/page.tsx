"use client";

import {
  CalendarClock,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

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
  Select,
  Textarea,
} from "@/components/ui";
import { addDays, formatDate, formatINR, todayISO } from "@/lib/format";
import {
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_OPTIONS,
  type VendorStatus,
} from "@/lib/labels";
import {
  fieldErrors,
  vendorInputSchema,
  type VendorInput,
  type VendorRecord,
} from "@/lib/schema";
import { useGatherly } from "@/lib/store";

const EMPTY_FORM = {
  name: "",
  category: "",
  contact: "",
  estimatedCost: "0",
  quotedCost: "0",
  status: "considering" as VendorStatus,
  followUpDate: "",
  notes: "",
};

const STAGES: VendorStatus[] = ["considering", "contacted", "booked"];

const STATUS_TONE: Record<VendorStatus, "neutral" | "accent" | "positive" | "danger"> = {
  considering: "neutral",
  contacted: "accent",
  booked: "positive",
  declined: "danger",
};

function toVendorInput(vendor: VendorRecord): VendorInput {
  return {
    name: vendor.name,
    category: vendor.category,
    contact: vendor.contact,
    estimatedCost: vendor.estimatedCost,
    quotedCost: vendor.quotedCost,
    status: vendor.status,
    followUpDate: vendor.followUpDate,
    notes: vendor.notes,
  };
}

function toForm(vendor: VendorRecord): typeof EMPTY_FORM {
  return {
    name: vendor.name,
    category: vendor.category,
    contact: vendor.contact,
    estimatedCost: String(vendor.estimatedCost),
    quotedCost: String(vendor.quotedCost),
    status: vendor.status,
    followUpDate: vendor.followUpDate,
    notes: vendor.notes,
  };
}

function StageRail({ status }: { status: VendorStatus }) {
  if (status === "declined") {
    return (
      <div className="mt-3 flex items-center gap-2">
        <span className="h-1 flex-1 rounded-full bg-lilac" />
        <Badge tone="danger">Declined</Badge>
      </div>
    );
  }
  const index = STAGES.indexOf(status);
  return (
    <div className="mt-3 flex items-center gap-2" aria-hidden="true">
      {STAGES.map((stage, stageIndex) => (
        <span
          key={stage}
          className={`h-1 flex-1 rounded-full ${
            stageIndex <= index ? "bg-accent" : "bg-lilac"
          }`}
        />
      ))}
      <span className="w-20 text-right text-[10px] font-medium uppercase tracking-[0.1em] text-ink-faint">
        {VENDOR_STATUS_LABELS[status]}
      </span>
    </div>
  );
}

export default function VendorsPage() {
  const { state, ready, activeEvent, actions } = useGatherly();
  const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<VendorRecord | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (formMode !== "closed") {
      panelRef.current?.focus();
    } else if (wasOpen.current) {
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus();
      else toggleRef.current?.focus();
    }
    wasOpen.current = formMode !== "closed";
  }, [formMode]);

  if (!ready) return <LoadingPanel label="Loading vendors" />;
  if (!activeEvent) {
    return (
      <div>
        <PageHeader
          eyebrow="Vendors"
          title="A shortlist worth trusting"
          description="Track quotes, contacts, and the follow-ups that keep bookings moving."
        />
        <NoEventState />
      </div>
    );
  }

  const today = todayISO();
  const vendors = state.vendors.filter((vendor) => vendor.eventId === activeEvent.id);
  const booked = vendors.filter((vendor) => vendor.status === "booked").length;
  const activeVendors = vendors.filter((vendor) => vendor.status !== "declined");
  const quotedTotal = activeVendors.reduce((sum, vendor) => sum + vendor.quotedCost, 0);
  const followUps = activeVendors.filter(
    (vendor) => vendor.followUpDate !== "" && vendor.followUpDate <= addDays(today, 7),
  ).length;

  const counts: Record<VendorStatus | "all", number> = {
    all: vendors.length,
    considering: vendors.filter((vendor) => vendor.status === "considering").length,
    contacted: vendors.filter((vendor) => vendor.status === "contacted").length,
    booked,
    declined: vendors.filter((vendor) => vendor.status === "declined").length,
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleVendors = vendors.filter((vendor) => {
    const matchesStatus = statusFilter === "all" || vendor.status === statusFilter;
    const haystack =
      `${vendor.name} ${vendor.category} ${vendor.contact} ${vendor.notes}`.toLowerCase();
    return matchesStatus && (normalizedQuery === "" || haystack.includes(normalizedQuery));
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openAdd() {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setFormMode("add");
  }

  function openEdit(vendor: VendorRecord) {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setForm(toForm(vendor));
    setEditingId(vendor.id);
    setErrors({});
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode("closed");
    setEditingId(null);
    setErrors({});
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = vendorInputSchema.safeParse({
      ...form,
      estimatedCost:
        form.estimatedCost.trim() === "" ? Number.NaN : Number(form.estimatedCost),
      quotedCost: form.quotedCost.trim() === "" ? Number.NaN : Number(form.quotedCost),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setStatus("Please fix the highlighted fields.");
      return;
    }

    if (formMode === "edit" && editingId) {
      actions.updateVendor(editingId, parsed.data);
      setStatus(`Updated ${parsed.data.name}.`);
    } else {
      actions.addVendor(parsed.data);
      setStatus(`Added ${parsed.data.name} to the shortlist.`);
    }

    setForm(EMPTY_FORM);
    setErrors({});
    closeForm();
  }

  function handleStatusChange(vendor: VendorRecord, next: VendorStatus) {
    actions.updateVendor(vendor.id, { ...toVendorInput(vendor), status: next });
    setStatus(`Moved ${vendor.name} to ${VENDOR_STATUS_LABELS[next]}.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendors"
        title="A shortlist worth trusting"
        description={`Quotes, contacts, and follow-ups for ${activeEvent.name}. Vendor costs stay separate from the budget until you decide.`}
      >
        <Badge tone={booked > 0 ? "positive" : "neutral"}>
          {booked} of {vendors.length} booked
        </Badge>
        <Button
          ref={toggleRef}
          onClick={() => {
            if (formMode === "closed") openAdd();
            else closeForm();
          }}
          aria-expanded={formMode !== "closed"}
          aria-controls="vendor-form-panel"
        >
          {formMode !== "closed" ? (
            <>
              <X aria-hidden="true" className="h-4 w-4" /> Close form
            </>
          ) : (
            <>
              <Plus aria-hidden="true" className="h-4 w-4" /> Add vendor
            </>
          )}
        </Button>
      </PageHeader>

      {status ? (
        <p role="status" className="text-sm text-ink-soft">
          {status}
        </p>
      ) : null}

      {formMode !== "closed" ? (
        <div id="vendor-form-panel" ref={panelRef} tabIndex={-1} className="enter outline-none">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-2xl text-ink">
              {formMode === "edit" ? "Edit vendor" : "Add a vendor"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Costs here are tracked separately from the category budget.
            </p>
            <form onSubmit={handleSubmit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Vendor name" htmlFor="vendor-name" error={errors.name}>
                <Input
                  id="vendor-name"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Spice Route Catering"
                  aria-invalid={Boolean(errors.name) || undefined}
                  aria-describedby={errors.name ? "vendor-name-error" : undefined}
                />
              </Field>
              <Field
                label="Category"
                htmlFor="vendor-category"
                error={errors.category}
                hint="Venue, Catering, Photography…"
              >
                <Input
                  id="vendor-category"
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  placeholder="Catering"
                  aria-invalid={Boolean(errors.category) || undefined}
                  aria-describedby={
                    errors.category ? "vendor-category-error" : "vendor-category-hint"
                  }
                />
              </Field>
              <Field label="Contact" htmlFor="vendor-contact" error={errors.contact}>
                <Input
                  id="vendor-contact"
                  value={form.contact}
                  onChange={(event) => update("contact", event.target.value)}
                  placeholder="Phone, email, or both"
                  aria-invalid={Boolean(errors.contact) || undefined}
                  aria-describedby={errors.contact ? "vendor-contact-error" : undefined}
                />
              </Field>
              <Field label="Status" htmlFor="vendor-status">
                <Select
                  id="vendor-status"
                  value={form.status}
                  onChange={(event) => update("status", event.target.value as VendorStatus)}
                >
                  {VENDOR_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Estimated cost (₹)"
                htmlFor="vendor-estimate"
                error={errors.estimatedCost}
              >
                <Input
                  id="vendor-estimate"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={form.estimatedCost}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => update("estimatedCost", event.target.value)}
                  aria-invalid={Boolean(errors.estimatedCost) || undefined}
                  aria-describedby={errors.estimatedCost ? "vendor-estimate-error" : undefined}
                />
              </Field>
              <Field label="Quoted cost (₹)" htmlFor="vendor-quote" error={errors.quotedCost}>
                <Input
                  id="vendor-quote"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={form.quotedCost}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => update("quotedCost", event.target.value)}
                  aria-invalid={Boolean(errors.quotedCost) || undefined}
                  aria-describedby={errors.quotedCost ? "vendor-quote-error" : undefined}
                />
              </Field>
              <Field
                label="Follow-up date"
                htmlFor="vendor-followup"
                error={errors.followUpDate}
                hint="Optional."
              >
                <Input
                  id="vendor-followup"
                  type="date"
                  value={form.followUpDate}
                  onChange={(event) => update("followUpDate", event.target.value)}
                  aria-invalid={Boolean(errors.followUpDate) || undefined}
                  aria-describedby={
                    errors.followUpDate ? "vendor-followup-error" : "vendor-followup-hint"
                  }
                />
              </Field>
              <Field
                label="Notes"
                htmlFor="vendor-notes"
                error={errors.notes}
                className="sm:col-span-2"
              >
                <Textarea
                  id="vendor-notes"
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="What did they quote? What still needs confirming?"
                  aria-invalid={Boolean(errors.notes) || undefined}
                  aria-describedby={errors.notes ? "vendor-notes-error" : undefined}
                />
              </Field>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit">
                  {formMode === "edit" ? "Save changes" : "Add vendor"}
                </Button>
                <Button variant="ghost" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {vendors.length === 0 ? (
        <EmptyBlock
          icon={<Store aria-hidden="true" className="h-5 w-5" />}
          title="No vendors yet"
          description="Add the venue, caterer, or photographer you are comparing. Costs here do not change the budget automatically."
          action={
            <Button onClick={openAdd}>
              <Plus aria-hidden="true" className="h-4 w-4" /> Add first vendor
            </Button>
          }
        />
      ) : (
        <>
          <Card className="enter grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
            <div className="bg-surface p-5">
              <Eyebrow>On the shortlist</Eyebrow>
              <p className="mt-2 font-display text-[1.6rem] text-ink">{vendors.length}</p>
              <p className="mt-1 text-xs text-ink-soft">Across every category</p>
            </div>
            <div className="bg-surface p-5">
              <Eyebrow>Booked</Eyebrow>
              <p className="mt-2 font-display text-[1.6rem] text-positive">{booked}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {vendors.length - booked} still in conversation
              </p>
            </div>
            <div className="bg-surface p-5">
              <Eyebrow>Active quotes</Eyebrow>
              <p className="mt-2 font-display text-[1.6rem] text-ink">
                {formatINR(quotedTotal)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Declined vendors excluded</p>
            </div>
            <div className="bg-surface p-5">
              <Eyebrow>Follow-ups due</Eyebrow>
              <p className="mt-2 font-display text-[1.6rem] text-ink">{followUps}</p>
              <p className="mt-1 text-xs text-ink-soft">Within the next seven days</p>
            </div>
          </Card>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              />
              <label htmlFor="vendor-search" className="sr-only">
                Search vendors
              </label>
              <Input
                id="vendor-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, category, or contact"
                className="pl-10"
              />
            </div>

            <div
              role="group"
              aria-label="Filter vendors by status"
              className="flex flex-wrap gap-1.5"
            >
              {(["all", ...STAGES, "declined"] as const).map((value) => {
                const label = value === "all" ? "All" : VENDOR_STATUS_LABELS[value];
                const active = statusFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatusFilter(value)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-plum bg-plum text-on-dark"
                        : "border-line bg-surface text-ink-soft hover:border-accent/30 hover:text-ink"
                    }`}
                  >
                    {label}
                    <span
                      className={`ml-1.5 tabular-nums ${active ? "text-on-dark-soft" : "text-ink-faint"}`}
                    >
                      {counts[value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {visibleVendors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface-tint px-6 py-10 text-center">
              <p className="font-display text-xl text-ink">No vendors match</p>
              <p className="mt-1 text-sm text-ink-soft">
                Try a different search or clear the status filter.
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {visibleVendors.map((vendor) => {
                const delta = vendor.quotedCost - vendor.estimatedCost;
                const deltaLabel =
                  delta === 0
                    ? "On estimate"
                    : delta > 0
                      ? `+${formatINR(delta)} over`
                      : `${formatINR(Math.abs(delta))} under`;
                const deltaClass =
                  delta === 0 ? "text-ink-soft" : delta > 0 ? "text-warning" : "text-positive";
                const followUpLate =
                  vendor.followUpDate !== "" && vendor.followUpDate < today;

                return (
                  <li key={vendor.id} className="min-w-0">
                    <Card className="flex h-full min-w-0 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={STATUS_TONE[vendor.status]}>
                              {VENDOR_STATUS_LABELS[vendor.status]}
                            </Badge>
                            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                              {vendor.category}
                            </span>
                          </div>
                          <h2 className="mt-2 font-display text-2xl leading-tight tracking-tight text-ink">
                            {vendor.name}
                          </h2>
                          {vendor.contact ? (
                            <p className="mt-1 break-words text-sm text-ink-soft">
                              {vendor.contact}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Button
                            variant="ghost"
                            onClick={() => openEdit(vendor)}
                            aria-label={`Edit ${vendor.name}`}
                            className="px-2 text-ink-faint hover:text-accent"
                          >
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setDeleteTarget(vendor)}
                            aria-label={`Delete ${vendor.name}`}
                            className="px-2 text-ink-faint hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <StageRail status={vendor.status} />

                      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
                        <div>
                          <dt className="text-xs text-ink-soft">Quote</dt>
                          <dd className="mt-0.5 font-medium tabular-nums text-ink">
                            {formatINR(vendor.quotedCost)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-soft">Estimate</dt>
                          <dd className="mt-0.5 tabular-nums text-ink">
                            {formatINR(vendor.estimatedCost)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-soft">Difference</dt>
                          <dd className={`mt-0.5 tabular-nums ${deltaClass}`}>{deltaLabel}</dd>
                        </div>
                      </dl>

                      {vendor.followUpDate ? (
                        <p
                          className={`mt-3 flex items-center gap-1.5 text-xs ${
                            followUpLate ? "font-medium text-danger" : "text-ink-soft"
                          }`}
                        >
                          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
                          Follow up {followUpLate ? "was due" : ""}{" "}
                          {formatDate(vendor.followUpDate)}
                        </p>
                      ) : null}

                      {vendor.notes ? (
                        <p className="mt-3 rounded-xl bg-surface-tint px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
                          {vendor.notes}
                        </p>
                      ) : null}

                      <div className="mt-auto pt-4">
                        <label
                          htmlFor={`status-${vendor.id}`}
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint"
                        >
                          Move stage
                        </label>
                        <Select
                          id={`status-${vendor.id}`}
                          value={vendor.status}
                          onChange={(event) =>
                            handleStatusChange(vendor, event.target.value as VendorStatus)
                          }
                          className="h-9 text-xs"
                        >
                          {VENDOR_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.name ?? "this vendor"}”?`}
        description="The vendor, quote, follow-up date, and notes are removed from this event. Other events are untouched."
        confirmLabel="Delete vendor"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            actions.deleteVendor(deleteTarget.id);
            setStatus(`Deleted ${deleteTarget.name}.`);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
