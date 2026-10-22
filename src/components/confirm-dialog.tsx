"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="m-auto w-[min(92vw,28rem)] max-h-[90svh] overflow-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-plum/55"
    >
      <div className="p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-danger">
          Please confirm
        </p>
        <h2 id={titleId} className="mt-2 font-display text-2xl tracking-tight">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
