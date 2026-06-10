"use client";

import type { ProjectDto, TaskDto, TimeLogDto, TimesheetPeriodDto } from "@kloqra/contracts";
import {
  Button,
  ProjectColorDot,
  ShellMenuItem,
  ShellMenuPanel,
  TableCell,
  TableRow,
  cn
} from "@kloqra/ui";
import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toDateKeyInZone } from "../timesheet/calendar-utils";
import { formatEntryShortDate } from "../timesheet/display-format";
import { resolveEntryApprovalStatus } from "./entry-approval-status";
import { formatHoursCompact } from "./group-logs-by-week";
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
  timezone
}: TimeTrackerEntryRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const approval = resolveEntryApprovalStatus(log, project, submissionByKey);
  const entryDate = new Date(log.startTime);
  const dateLabel = formatEntryShortDate(entryDate, timezone);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <TableRow className="group border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
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
        <TimeTrackerEntryStatus approval={approval} isBillable={log.isBillable} />
      </TableCell>
      <TableCell className="py-3.5 text-right">
        <div className="relative inline-block" ref={menuRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 opacity-70 group-hover:opacity-100"
            aria-label="Entry actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical className="size-4" />
          </Button>
          {menuOpen ? (
            <ShellMenuPanel className={cn("absolute right-0 top-full z-20 mt-1 min-w-[8rem]")}>
              <ShellMenuItem
                disabled={locked}
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(log);
                }}
              >
                Edit
              </ShellMenuItem>
              <ShellMenuItem
                tone="destructive"
                disabled={locked}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(log);
                }}
              >
                Delete
              </ShellMenuItem>
            </ShellMenuPanel>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function entryDateKey(log: TimeLogDto, timezone: string): string {
  return toDateKeyInZone(new Date(log.startTime), timezone);
}
