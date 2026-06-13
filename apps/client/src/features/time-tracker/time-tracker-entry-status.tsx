"use client";

import type { TimesheetApprovalStatus } from "@kloqra/ui";
import { Badge, cn } from "@kloqra/ui";
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {approvalStyle ? (
        <Badge variant="outline" className={cn("text-xs font-medium", approvalStyle.className)}>
          {approvalStyle.label}
        </Badge>
      ) : null}
      {isBillable ? (
        <Badge
          variant="outline"
          className="border-primary/25 bg-primary/10 text-primary text-xs font-medium uppercase tracking-wide"
        >
          Billable
        </Badge>
      ) : null}
    </div>
  );
}
