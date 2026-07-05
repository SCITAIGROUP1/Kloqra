"use client";

import type { ProjectDto, TaskDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import { cn, ProjectColorDot, TableCell, TableRow } from "@kloqra/ui";
import { toDateKeyInZone } from "../timesheet/calendar-utils";
import { formatEntryShortDate } from "../timesheet/display-format";
import { resolveEntryApprovalStatus } from "./entry-approval-status";
import { formatHoursCompact } from "./group-logs-by-week";
import { TimeTrackerEntryActions } from "./time-tracker-entry-actions";
import { TimeTrackerEntryStatus } from "./time-tracker-entry-status";

type TimeTrackerEntryRowProps = {
  log: TimeLogDto;
  task?: TaskDto;
  project?: ProjectDto;
  projectName: string;
  entryColor: string;
  submissionByKey: Map<string, TimesheetPeriodDto>;
  locked: boolean;
  onEdit: (log: TimeLogDto) => void;
  onDelete: (log: TimeLogDto) => void;
  timezone: string;
  readOnly?: boolean;
};

export function TimeTrackerEntryRow({
  log,
  task,
  project,
  projectName,
  entryColor,
  submissionByKey,
  locked,
  onEdit,
  onDelete,
  timezone,
  readOnly = false
}: TimeTrackerEntryRowProps) {
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  const entryDate = new Date(log.startTime);
  const dateLabel = formatEntryShortDate(entryDate, timezone);
  const isOffline = (log as TimeLogDto & { isOffline?: boolean }).isOffline;
  const syncStatus = (log as TimeLogDto & { syncStatus?: string }).syncStatus;

  return (
    <TableRow
      className={cn(
        "group border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors",
        isOffline &&
          "border-dashed border-amber-500/30 bg-amber-500/[0.02] dark:bg-amber-500/[0.01]"
      )}
    >
      <TableCell className="whitespace-nowrap py-3.5 text-sm text-muted-foreground">
        {dateLabel}
      </TableCell>
      <TableCell className="max-w-[200px] py-3.5">
        <span className="flex items-center gap-2 truncate">
          <ProjectColorDot color={entryColor} />
          <span className="truncate font-medium text-foreground">{projectName}</span>
        </span>
      </TableCell>
      <TableCell className="max-w-[140px] py-3.5">
        {task ? (
          <span className="inline-flex max-w-full truncate rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
            {task.taskName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-[260px] truncate py-3.5 text-sm text-muted-foreground">
        {log.description || "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap py-3.5 tabular-nums text-sm font-semibold text-foreground">
        {formatHoursCompact(log.durationSec)}
      </TableCell>
      <TableCell className="py-3.5">
        <TimeTrackerEntryStatus
          approval={approval}
          isBillable={log.isBillable}
          isOffline={isOffline}
          syncStatus={syncStatus}
        />
      </TableCell>
      {readOnly ? (
        <TableCell className="py-3.5" />
      ) : (
        <TableCell className="py-3.5 text-right">
          <TimeTrackerEntryActions log={log} locked={locked} onEdit={onEdit} onDelete={onDelete} />
        </TableCell>
      )}
    </TableRow>
  );
}

export function entryDateKey(log: TimeLogDto, timezone: string): string {
  return toDateKeyInZone(new Date(log.startTime), timezone);
}
