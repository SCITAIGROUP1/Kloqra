"use client";

import type { ProjectDto, TaskDto } from "@kloqra/contracts";
import { Card, CardContent, EmptyState, TablePagination } from "@kloqra/ui";
import { CalendarDays, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { WeekLogGroup } from "./group-logs-by-week";
import {
  buildWeekDayTabs,
  defaultActiveDayKey,
  formatHoursDecimalWithSuffix,
  formatWeekSectionLabel
} from "./group-logs-by-week";
import { TimeTrackerDayTabs } from "./time-tracker-day-tabs";
import { AdminTimeTrackerEntryListItem } from "./time-tracker-entry-list-item";
import { formatProjectLabel } from "@/lib/project-labels";

const WEEKS_PER_PAGE_OPTIONS = [1, 2, 4] as const;

export type AdminTimeTrackerWeekListProps = {
  groups: WeekLogGroup[];
  weekTotals: Map<string, { totalSec: number; billableSec: number }>;
  tasks: TaskDto[];
  projects: ProjectDto[];
  workspaceNamesById: Record<string, string>;
  entryColor: (taskId: string) => string;
  memberMap: Map<string, string>;
  timezone: string;
  weekStartPref: "monday" | "sunday";
  rangeFrom: string;
  rangeTo: string;
  loading?: boolean;
  page: number;
  weeksPerPage: number;
  onWeeksPerPageChange: (weeksPerPage: number) => void;
  onPageChange: (page: number) => void;
  totalWeekPages: number;
  totalWeekCount: number;
  weekRangeSummary: string;
};

function WeekTotals({ totalSec, billableSec }: { totalSec: number; billableSec: number }) {
  return (
    <p className="text-xs text-muted-foreground sm:text-sm">
      Total:{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {formatHoursDecimalWithSuffix(totalSec)}
      </span>
      <span className="mx-1.5 text-border">·</span>
      Billable:{" "}
      <span className="font-semibold tabular-nums text-primary">
        {formatHoursDecimalWithSuffix(billableSec)}
      </span>
    </p>
  );
}

type WeekListPaginationProps = {
  page: number;
  totalWeekPages: number;
  totalWeekCount: number;
  weeksPerPage: number;
  onPageChange: (page: number) => void;
  onWeeksPerPageChange: (weeksPerPage: number) => void;
  weekRangeSummary: string;
  loading?: boolean;
};

function WeekListPagination({
  page,
  totalWeekPages,
  totalWeekCount,
  weeksPerPage,
  onPageChange,
  onWeeksPerPageChange,
  weekRangeSummary,
  loading = false
}: WeekListPaginationProps) {
  return (
    <Card className="gap-0 overflow-hidden border-primary/10 p-0 shadow-sm">
      <TablePagination
        page={page}
        totalPages={totalWeekPages}
        total={totalWeekCount}
        limit={weeksPerPage}
        onPageChange={onPageChange}
        onLimitChange={onWeeksPerPageChange}
        pageSizeOptions={WEEKS_PER_PAGE_OPTIONS}
        pageUnit="Week"
        pageSizeLabel="Weeks per page"
        summary={
          weekRangeSummary ? (
            <span className="hidden truncate sm:inline">{weekRangeSummary}</span>
          ) : (
            weekRangeSummary
          )
        }
        disabled={loading}
      />
    </Card>
  );
}

type WeekSectionProps = {
  group: WeekLogGroup;
  weekTotals: Map<string, { totalSec: number; billableSec: number }>;
  taskById: Map<string, TaskDto>;
  projectById: Map<string, ProjectDto>;
  workspaceNamesById: Record<string, string>;
  entryColor: (taskId: string) => string;
  memberMap: Map<string, string>;
  timezone: string;
  weekStartPref: "monday" | "sunday";
  rangeFrom: string;
  rangeTo: string;
};

function AdminTimeTrackerWeekSection({
  group,
  weekTotals,
  taskById,
  projectById,
  workspaceNamesById,
  entryColor,
  memberMap,
  timezone,
  weekStartPref,
  rangeFrom,
  rangeTo
}: WeekSectionProps) {
  const dayGroups = useMemo(
    () =>
      buildWeekDayTabs(group.weekStart, group.logs, timezone, weekStartPref, rangeFrom, rangeTo),
    [group.weekStart, group.logs, timezone, weekStartPref, rangeFrom, rangeTo]
  );

  const [activeDayKey, setActiveDayKey] = useState(() => defaultActiveDayKey(dayGroups));

  useEffect(() => {
    if (!dayGroups.some((day) => day.dayKey === activeDayKey)) {
      setActiveDayKey(defaultActiveDayKey(dayGroups));
    }
  }, [group.weekKey, dayGroups, activeDayKey]);

  const activeDay = dayGroups.find((day) => day.dayKey === activeDayKey);
  const totals = weekTotals.get(group.weekKey) ?? { totalSec: 0, billableSec: 0 };

  return (
    <Card className="gap-0 overflow-hidden border-primary/10 p-0 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border/70 bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-8">
            <CalendarDays className="size-4" aria-hidden />
          </div>
          <h2 className="text-xs font-semibold leading-tight tracking-tight text-foreground sm:text-sm">
            {formatWeekSectionLabel(group.weekStart, timezone)}
          </h2>
        </div>
        <WeekTotals totalSec={totals.totalSec} billableSec={totals.billableSec} />
      </div>

      {dayGroups.length > 0 ? (
        <>
          <TimeTrackerDayTabs
            days={dayGroups}
            activeDayKey={activeDayKey}
            onDayChange={setActiveDayKey}
          />
          <div>
            {(activeDay?.logs ?? []).length > 0 ? (
              (activeDay?.logs ?? []).map((log) => {
                const task = taskById.get(log.taskId);
                const project = task ? projectById.get(task.projectId) : undefined;
                const memberName = memberMap.get(log.userId) ?? "—";
                return (
                  <AdminTimeTrackerEntryListItem
                    key={log.id}
                    log={log}
                    task={task}
                    project={project}
                    projectName={project ? formatProjectLabel(project, workspaceNamesById) : "—"}
                    entryColor={entryColor(log.taskId)}
                    memberName={memberName}
                  />
                );
              })
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No time entries for this day.
              </p>
            )}
          </div>
        </>
      ) : null}
    </Card>
  );
}

export function AdminTimeTrackerWeekList({
  groups,
  weekTotals,
  tasks,
  projects,
  workspaceNamesById,
  entryColor,
  memberMap,
  timezone,
  weekStartPref,
  rangeFrom,
  rangeTo,
  loading = false,
  page,
  weeksPerPage,
  onWeeksPerPageChange,
  onPageChange,
  totalWeekPages,
  totalWeekCount,
  weekRangeSummary
}: AdminTimeTrackerWeekListProps) {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  if (loading && groups.length === 0) {
    return (
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading time entries…
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="py-12">
          <EmptyState
            title="No time entries"
            description="No entries match your filters for this period."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <AdminTimeTrackerWeekSection
          key={group.weekKey}
          group={group}
          weekTotals={weekTotals}
          taskById={taskById}
          projectById={projectById}
          workspaceNamesById={workspaceNamesById}
          entryColor={entryColor}
          memberMap={memberMap}
          timezone={timezone}
          weekStartPref={weekStartPref}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      ))}

      <WeekListPagination
        page={page}
        totalWeekPages={totalWeekPages}
        totalWeekCount={totalWeekCount}
        weeksPerPage={weeksPerPage}
        onPageChange={onPageChange}
        onWeeksPerPageChange={onWeeksPerPageChange}
        weekRangeSummary={weekRangeSummary}
        loading={loading}
      />
    </div>
  );
}

export function formatVisibleWeeksSummary(groups: WeekLogGroup[], timezone: string): string {
  if (groups.length === 0) return "";
  if (groups.length === 1) {
    return formatWeekSectionLabel(groups[0]!.weekStart, timezone);
  }
  const newest = groups[0]!;
  const oldest = groups[groups.length - 1]!;
  return `${formatWeekSectionLabel(oldest.weekStart, timezone)} – ${formatWeekSectionLabel(newest.weekStart, timezone)}`;
}
