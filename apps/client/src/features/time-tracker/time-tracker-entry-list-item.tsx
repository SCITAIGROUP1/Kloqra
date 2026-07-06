"use client";

import type { ProjectDto, TaskDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import { ProjectColorDot, cn } from "@kloqra/ui";
import { Lock } from "lucide-react";
import { resolveEntryApprovalStatus } from "./entry-approval-status";
import { formatHoursDecimal } from "./group-logs-by-week";
import { TimeTrackerEntryActions } from "./time-tracker-entry-actions";
import { TimeTrackerEntryStatus } from "./time-tracker-entry-status";

type TimeTrackerEntryListItemProps = {
  log: TimeLogDto;
  task?: TaskDto;
  project?: ProjectDto;
  projectName: string;
  entryColor: string;
  submissionByKey: Map<string, TimesheetPeriodDto>;
  locked: boolean;
  inactive?: boolean;
  onEdit: (log: TimeLogDto) => void;
  onDelete: (log: TimeLogDto) => void;
  readOnly?: boolean;
};

function entryDetailLine(taskName: string | undefined, description: string | null): string | null {
  const parts = [taskName, description?.trim() || null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TimeTrackerEntryListItem({
  log,
  task,
  project,
  projectName,
  entryColor,
  submissionByKey,
  locked,
  inactive = false,
  onEdit,
  onDelete,
  readOnly = false
}: TimeTrackerEntryListItemProps) {
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  const detailLine = entryDetailLine(task?.taskName, log.description);

  return (
    <div
      className={cn(
        "group border-b border-border/50 px-3 py-3 transition-colors last:border-0 sm:px-5 sm:py-3.5",
        inactive ? "bg-muted/50 hover:bg-muted/50" : "hover:bg-muted/20"
      )}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <ProjectColorDot
          color={entryColor}
          className={cn("mt-1 shrink-0", inactive && "opacity-60")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug sm:truncate",
                    inactive ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {projectName}
                </p>
                {inactive ? (
                  <span title="Read-only — project, category, or task is inactive">
                    <Lock
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Inactive"
                    />
                  </span>
                ) : null}
                <TimeTrackerEntryStatus approval={approval} isBillable={log.isBillable} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  inactive ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {formatHoursDecimal(log.durationSec)}
              </span>
              {!readOnly && !inactive ? (
                <TimeTrackerEntryActions
                  log={log}
                  locked={locked}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ) : null}
            </div>
          </div>
          {detailLine ? (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm leading-snug sm:mt-0.5 sm:truncate",
                inactive ? "text-muted-foreground/90" : "text-muted-foreground"
              )}
            >
              {detailLine}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
