import type { NotificationDto, NotificationType } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Download,
  FolderKanban,
  Link2,
  Timer,
  Users
} from "lucide-react";

export function iconForNotificationType(type: NotificationType, title?: string | null): LucideIcon {
  const lowerTitle = title?.toLowerCase() ?? "";
  if (
    type === "APPROVAL_REQUEST" ||
    type === "TIMESHEET_SUBMITTED" ||
    type === "TIMESHEET_AMENDMENT_REQUESTED" ||
    lowerTitle.includes("amendment")
  ) {
    return ClipboardCheck;
  }
  switch (type) {
    case "PROJECT_ASSIGNMENT":
      return FolderKanban;
    case "TASK_ASSIGNMENT":
      return CheckSquare;
    case "TIMESHEET_REMINDER":
    case "TIMESHEET_STATUS":
    case "TIMESHEET_APPROVED":
    case "TIMESHEET_REJECTED":
    case "TIMESHEET_AMENDMENT_APPROVED":
    case "TIMESHEET_AMENDMENT_DENIED":
      return Clock;
    case "IDLE_TIMER_ALERT":
    case "TIMER_AUTOSTOPPED":
      return Timer;
    case "JIRA_SYNC_UPDATE":
      return Link2;
    case "MEMBER_CHANGE":
    case "WORKSPACE_ADDED":
      return Users;
    case "EXPORT_SCHEDULE":
      return Download;
    case "BUDGET_ALERT":
      return AlertTriangle;
    default:
      return Bell;
  }
}

export function notificationVariantClass(metadata?: NotificationDto["metadata"]): string {
  switch (metadata?.variant) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "attention":
      return "border-amber-500/30 bg-amber-500/5";
    case "warning":
      return "border-destructive/30 bg-destructive/5";
    case "info":
      return "border-primary/30 bg-primary/5";
    default:
      return "";
  }
}

export function notificationRowClass(item: NotificationDto, extra?: string): string {
  return cn(
    "flex w-full items-start gap-3 text-left",
    "transition-[background-color,opacity] duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
    "hover:bg-muted/40",
    !item.readAt && "bg-primary/5",
    item.readAt && "opacity-90",
    notificationVariantClass(item.metadata),
    extra
  );
}

export function NotificationDetails({
  details
}: {
  details?: NonNullable<NotificationDto["metadata"]>["details"];
}) {
  if (!details?.length) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {details.map((row) => (
        <li key={`${row.label}-${row.value}`} className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{row.label}:</span> {row.value}
        </li>
      ))}
    </ul>
  );
}
