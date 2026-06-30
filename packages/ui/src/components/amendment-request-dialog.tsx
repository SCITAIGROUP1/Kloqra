"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { AppModal } from "./ui/app-modal.js";
import { Button } from "./ui/button.js";
import { Label } from "./ui/label.js";

export type AmendmentRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  periodLabel: string;
  submitting?: boolean;
  onSubmit: (reason: string) => void;
};

export function AmendmentRequestDialog({
  open,
  onOpenChange,
  projectName,
  periodLabel,
  submitting = false,
  onSubmit
}: AmendmentRequestDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Request to edit timesheet"
      description="Confirm your request to unlock this period for edits. Admins will review it before you can make changes."
      icon={<MessageSquare className="size-5" />}
      tone="default"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || reason.trim().length === 0}
            onClick={() => onSubmit(reason.trim())}
          >
            {submitting ? "Sending…" : "Confirm request"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
          <p className="font-medium">{projectName}</p>
          <p className="text-muted-foreground mt-1">{periodLabel}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amendment-reason">Reason</Label>
          <textarea
            id="amendment-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what needs to be corrected"
            maxLength={500}
            rows={4}
            disabled={submitting}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    </AppModal>
  );
}
