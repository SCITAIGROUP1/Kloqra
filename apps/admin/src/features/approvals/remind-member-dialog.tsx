"use client";

import type { MissingTimesheetDto } from "@kloqra/contracts";
import { AppModal, Button, Input, Label } from "@kloqra/ui";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

export type RemindMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MissingTimesheetDto | null;
  submitting?: boolean;
  onConfirm: (message: string) => void;
};

export function RemindMemberDialog({
  open,
  onOpenChange,
  item,
  submitting = false,
  onConfirm
}: RemindMemberDialogProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) setMessage("");
  }, [open, item?.userId]);

  if (!item) return null;

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Remind member to submit"
      description="Send a notification with an optional personal message."
      icon={<Bell className="size-5" />}
      tone="default"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => onConfirm(message.trim())}>
            {submitting ? "Sending…" : "Send reminder"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
          <p>
            <span className="text-muted-foreground">Member:</span> {item.userName}
          </p>
          <p>
            <span className="text-muted-foreground">Project:</span> {item.projectName}
          </p>
          <p>
            <span className="text-muted-foreground">Period:</span> {item.periodLabel}
          </p>
          <p>
            <span className="text-muted-foreground">Hours logged:</span>{" "}
            {item.totalHours.toFixed(1)}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="remind-message">Message (optional)</Label>
          <Input
            id="remind-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note for the member"
            maxLength={300}
            disabled={submitting}
          />
        </div>
      </div>
    </AppModal>
  );
}
