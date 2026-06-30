"use client";

import type { TimesheetApprovalStatus } from "@kloqra/ui";
import { Badge, cn } from "@kloqra/ui";
import { Lock } from "lucide-react";
import type { EntryApprovalDisplay } from "./entry-approval-status";

const APPROVAL_STYLES: Partial<
  Record<TimesheetApprovalStatus, { label: string; className: string }>
> = {
  SUBMITTED: {
    label: "pending",
    className:
      "border-status-warning-border bg-status-warning-bg text-status-warning-fg normal-case tracking-normal"
  },
  APPROVED: {
    label: "approved",
    className:
      "border-status-success-border bg-status-success-bg text-status-success-fg normal-case tracking-normal"
  },
  REJECTED: {
    label: "rejected",
    className:
      "border-status-danger-border bg-status-danger-bg text-status-danger-fg normal-case tracking-normal"
  }
};

export function TimeTrackerEntryStatus({
  approval,
  isBillable
}: {
  approval: EntryApprovalDisplay;
  isBillable: boolean;
}) {
  const approvalStyle =
    approval.status && approval.showApproval ? APPROVAL_STYLES[approval.status] : undefined;
  const isLocked = approval.status === "SUBMITTED" || approval.status === "APPROVED";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isLocked ? (
        <Badge
          variant="outline"
          className="gap-1 border-muted-foreground/30 bg-muted/40 text-muted-foreground text-xs font-medium normal-case tracking-normal"
          title="Locked — submitted or approved"
        >
          <Lock className="size-3" aria-hidden />
          Locked
        </Badge>
      ) : null}
      {approvalStyle ? (
        <Badge variant="outline" className={cn("text-xs font-medium", approvalStyle.className)}>
          {approvalStyle.label}
        </Badge>
      ) : null}
      {isBillable ? (
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/5 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-primary"
        >
          Billable
        </Badge>
      ) : null}
    </div>
  );
}
