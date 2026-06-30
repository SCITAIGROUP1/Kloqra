"use client";

import type { ProjectDto, TaskDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import { ProjectColorDot } from "@kloqra/ui";
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
  onEdit,
  onDelete,
  readOnly = false
}: TimeTrackerEntryListItemProps) {
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  const detailLine = entryDetailLine(task?.taskName, log.description);

  return (
    <div className="group border-b border-border/50 px-3 py-3 transition-colors last:border-0 hover:bg-muted/20 sm:px-5 sm:py-3.5">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <ProjectColorDot color={entryColor} className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <p className="text-sm font-semibold leading-snug text-foreground sm:truncate">
                  {projectName}
                </p>
                <TimeTrackerEntryStatus approval={approval} isBillable={log.isBillable} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatHoursDecimal(log.durationSec)}
              </span>
              {!readOnly ? (
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
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground sm:mt-0.5 sm:truncate">
              {detailLine}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
