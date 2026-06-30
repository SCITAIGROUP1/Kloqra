import { cn } from "../lib/utils.js";
import { Badge } from "./ui/badge.js";

export type TimesheetApprovalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "WAIVED";

const STATUS_CONFIG: Record<TimesheetApprovalStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border"
  },
  SUBMITTED: {
    label: "Pending",
    className: "bg-status-warning-bg text-status-warning-fg border-status-warning-border"
  },
  APPROVED: {
    label: "Approved",
    className: "bg-status-success-bg text-status-success-fg border-status-success-border"
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-status-danger-bg text-status-danger-fg border-status-danger-border"
  },
  WAIVED: {
    label: "Waived",
    className: "bg-muted text-muted-foreground border-border"
  }
};

export function TimesheetApprovalStatusBadge({
  status,
  amendmentPending = false,
  className
}: {
  status: TimesheetApprovalStatus;
  amendmentPending?: boolean;
  className?: string;
}) {
  if (amendmentPending) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium text-[10px] uppercase tracking-wider py-0.5 px-2",
          "bg-status-info-bg text-status-info-fg border-status-info-border",
          "transition-[background-color,border-color,color] duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
          className
        )}
      >
        Edit pending
      </Badge>
    );
  }

  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-[10px] uppercase tracking-wider py-0.5 px-2",
        config.className,
        "transition-[background-color,border-color,color] duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
