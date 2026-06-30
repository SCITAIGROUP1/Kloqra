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
            {submitting ? "Submitting…" : "Submit for review"}
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
            <p className="font-medium">{preview.targetPeriod.projectName}</p>
            <p className="text-muted-foreground mt-1">
              {preview.targetPeriod.periodStart.slice(0, 10)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Entries in this period will be locked until approved or unlocked by an admin.
          </p>
        </div>
      ) : null}
    </AppModal>
  );
}
