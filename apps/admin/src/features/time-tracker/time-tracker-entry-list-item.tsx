"use client";

import type { ProjectDto, TaskDto, TimeLogDto } from "@kloqra/contracts";
import { ProjectColorDot } from "@kloqra/ui";
import { resolveEntryApprovalStatus } from "./entry-approval-status";
import { formatHoursDecimal } from "./group-logs-by-week";
import { TimeTrackerEntryStatus } from "./time-tracker-entry-status";

type AdminTimeTrackerEntryListItemProps = {
  log: TimeLogDto;
  task?: TaskDto;
  project?: ProjectDto;
  projectName: string;
  entryColor: string;
  memberName: string;
};

function entryDetailLine(
  memberName: string,
  taskName: string | undefined,
  description: string | null
): string {
  return [memberName, taskName, description?.trim() || null].filter(Boolean).join(" · ");
}

export function AdminTimeTrackerEntryListItem({
  log,
  task,
  project,
  projectName,
  entryColor,
  memberName
}: AdminTimeTrackerEntryListItemProps) {
  const approval = resolveEntryApprovalStatus(log, project, new Map());
  const detailLine = entryDetailLine(memberName, task?.taskName, log.description);

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
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatHoursDecimal(log.durationSec)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground sm:mt-0.5 sm:truncate">
            {detailLine}
          </p>
        </div>
      </div>
    </div>
  );
}
