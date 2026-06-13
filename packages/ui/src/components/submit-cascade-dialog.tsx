"use client";

import type { TimesheetSubmitPreviewDto } from "@kloqra/contracts";
import { AlertTriangle } from "lucide-react";
import { AppModal } from "./ui/app-modal.js";
import { Button } from "./ui/button.js";

export type SubmitCascadeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: TimesheetSubmitPreviewDto | null;
  loading?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
};

export function SubmitCascadeDialog({
  open,
  onOpenChange,
  preview,
  loading = false,
  submitting = false,
  onConfirm
}: SubmitCascadeDialogProps) {
  const cascaded = preview?.cascadedPeriods ?? [];
  const totalPeriods = cascaded.length + 1;
  const blocked = Boolean(preview?.blockedReason);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Submit for review"
      description="Review the periods that will be locked after submission."
      icon={<AlertTriangle className="size-5" />}
      tone={blocked ? "destructive" : "warning"}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading || submitting || blocked || !preview}
            onClick={onConfirm}
          >
            {submitting
              ? "Submitting…"
              : `Submit ${totalPeriods} period${totalPeriods === 1 ? "" : "s"}`}
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      ) : blocked ? (
        <p className="text-sm text-destructive">{preview?.blockedReason}</p>
      ) : preview ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="font-medium">Primary period</p>
            <p className="text-muted-foreground mt-1">
              {preview.targetPeriod.projectName} ·{" "}
              {new Date(preview.targetPeriod.periodStart).toLocaleDateString()}
            </p>
          </div>
          {cascaded.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium">Also submitting</p>
              <ul className="space-y-1 text-muted-foreground">
                {cascaded.map((row: TimesheetSubmitPreviewDto["cascadedPeriods"][number]) => (
                  <li key={row.periodStart} className="flex justify-between gap-3">
                    <span>{row.periodLabel}</span>
                    <span className="font-mono">{row.totalHours.toFixed(1)} hrs</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Entries in these periods will be locked until approved or unlocked by an admin.
          </p>
        </div>
      ) : null}
    </AppModal>
  );
}
