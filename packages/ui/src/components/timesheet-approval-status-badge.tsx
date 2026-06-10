import { cn } from "../lib/utils.js";
import { Badge } from "./ui/badge.js";

export type TimesheetApprovalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

const STATUS_CONFIG: Record<TimesheetApprovalStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border"
  },
  SUBMITTED: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/25"
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/25"
  }
};

export function TimesheetApprovalStatusBadge({
  status,
  className
}: {
  status: TimesheetApprovalStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium text-[10px] uppercase tracking-wider py-0.5 px-2",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
