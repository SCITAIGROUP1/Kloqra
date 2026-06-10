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
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 normal-case tracking-normal"
  },
  APPROVED: {
    label: "approved",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 normal-case tracking-normal"
  },
  REJECTED: {
    label: "rejected",
    className:
      "border-destructive/30 bg-destructive/10 text-destructive normal-case tracking-normal"
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
