"use client";

import type { ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Card,
  CardContent,
  EmptyState,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination
} from "@kloqra/ui";
import { CalendarDays, Loader2 } from "lucide-react";
import type { WeekLogGroup } from "./group-logs-by-week";
import { formatHoursCompact, formatWeekSectionLabel } from "./group-logs-by-week";
import { AdminTimeTrackerEntryRow } from "./time-tracker-entry-row";
import { formatProjectLabel } from "@/lib/project-labels";

export type AdminTimeTrackerWeekListProps = {
  groups: WeekLogGroup[];
  weekTotals: Map<string, { totalSec: number; billableSec: number }>;
  tasks: TaskDto[];
  projects: ProjectDto[];
  workspaceNamesById: Record<string, string>;
  entryColor: (taskId: string) => string;
  memberMap: Map<string, string>;
  timezone: string;
  loading?: boolean;
  page: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
  logsLength: number;
  totalPages: number;
  totalCount: number;
};

function WeekTotals({ totalSec, billableSec }: { totalSec: number; billableSec: number }) {
  return (
    <p className="text-sm text-muted-foreground">
      Total:{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {formatHoursCompact(totalSec)}
      </span>
      <span className="mx-1.5 text-border">·</span>
      Billable:{" "}
      <span className="font-semibold tabular-nums text-primary">
        {formatHoursCompact(billableSec)}
      </span>
    </p>
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
  loading = false,
  page,
  limit,
  onLimitChange,
  onPageChange,
  totalPages,
  totalCount
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
        <Card key={group.weekKey} className="gap-0 overflow-hidden border-primary/10 p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarDays className="size-4" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {formatWeekSectionLabel(group.weekStart, timezone)}
              </h2>
            </div>
            {(() => {
              const totals = weekTotals.get(group.weekKey) ?? { totalSec: 0, billableSec: 0 };
              return <WeekTotals totalSec={totals.totalSec} billableSec={totals.billableSec} />;
            })()}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/70 bg-background hover:bg-background">
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Member
                  </TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Project
                  </TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Task
                  </TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Description
                  </TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Hours
                  </TableHead>
                  <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.logs.map((log) => {
                  const task = taskById.get(log.taskId);
                  const project = task ? projectById.get(task.projectId) : undefined;
                  const memberName = memberMap.get(log.userId) ?? "—";
                  return (
                    <AdminTimeTrackerEntryRow
                      key={log.id}
                      log={log}
                      task={task}
                      project={project}
                      projectName={project ? formatProjectLabel(project, workspaceNamesById) : "—"}
                      entryColor={entryColor(log.taskId)}
                      memberName={memberName}
                      timezone={timezone}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ))}

      {groups.length > 0 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={totalCount}
          limit={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          disabled={loading}
        />
      )}
    </div>
  );
}
