"use client";

import type { TimeLogDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { Button, ProjectColorDot } from "@kloqra/ui";
import { toDateKeyInZone, todayInZone } from "@kloqra/web-shared";
import { Lock, Play, Trash2, Clock } from "lucide-react";
import React, { useMemo } from "react";

export type TodayLogsWidgetProps = {
  logs: TimeLogDto[];
  projects: ProjectDto[];
  tasks: TaskDto[];
  onDeleteLog: (id: string) => Promise<void>;
  onResumeTask: (taskId: string) => Promise<void>;
  isLogLocked?: (log: TimeLogDto) => boolean;
  timezone?: string;
};

export function TodayLogsWidget({
  logs,
  projects,
  tasks,
  onDeleteLog,
  onResumeTask,
  isLogLocked,
  timezone
}: TodayLogsWidgetProps) {
  const resolvedTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const todayLogs = useMemo(() => {
    const todayStr = toDateKeyInZone(todayInZone(resolvedTz), resolvedTz);
    return logs
      .filter((log) => {
        const logDate = new Date(log.startTime);
        return toDateKeyInZone(logDate, resolvedTz) === todayStr;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [logs, resolvedTz]);

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: resolvedTz
    });
  }

  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  }

  if (todayLogs.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center p-4 text-center">
        <Clock className="mb-2 size-8 text-muted-foreground/45" />
        <p className="text-xs text-muted-foreground">
          No time tracked yet today. Hit start and get going.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[220px] flex-col gap-2">
      {todayLogs.map((log) => {
        const task = tasks.find((t) => t.id === log.taskId);
        const project = task ? projects.find((p) => p.id === task.projectId) : null;
        const projectName = project?.name ?? "No Project";
        const projectColor = project?.color ?? "var(--muted)";
        const locked = isLogLocked?.(log) ?? false;

        return (
          <div
            key={log.id}
            className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 text-xs transition-all hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <ProjectColorDot color={projectColor} size="sm" className="shrink-0" />
                <span className="max-w-[120px] truncate font-semibold text-foreground">
                  {projectName}
                </span>
                <span className="shrink-0 text-muted-foreground/40">&bull;</span>
                <span className="truncate text-muted-foreground">{task?.taskName ?? "Other"}</span>
                {locked ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                    title="Locked — submitted or approved"
                  >
                    <Lock className="size-2.5" aria-hidden />
                    Locked
                  </span>
                ) : null}
                {task?.categoryName ? (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {task.categoryName}
                  </span>
                ) : null}
              </div>
              {log.description && (
                <p className="truncate pl-4 text-[11px] font-normal text-muted-foreground sm:pl-4">
                  {log.description}
                </p>
              )}
              <div className="pl-4 font-mono text-[10px] text-muted-foreground/60">
                {formatTime(log.startTime)} - {formatTime(log.endTime)}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 sm:pl-1">
              <span className="font-mono font-semibold text-foreground">
                {formatDuration(log.durationSec)}
              </span>
              <div className="flex items-center gap-1 border-l border-border/40 pl-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded text-primary hover:bg-primary/10"
                  onClick={() => void onResumeTask(log.taskId)}
                  title="Restart timer for this task"
                >
                  <Play className="size-3.5 fill-current" />
                </Button>
                {!locked ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded text-destructive hover:bg-destructive/15"
                    onClick={() => void onDeleteLog(log.id)}
                    title="Delete time entry"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TodayLogsWidget;
