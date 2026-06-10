"use client";

import type { TimeLogDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { Button, ProjectColorDot } from "@kloqra/ui";
import { Play, Trash2, Clock } from "lucide-react";
import React, { useMemo } from "react";
import { toDateKey } from "@/features/timesheet/calendar-utils";

interface TodayLogsWidgetProps {
  logs: TimeLogDto[];
  projects: ProjectDto[];
  tasks: TaskDto[];
  onDeleteLog: (id: string) => Promise<void>;
  onResumeTask: (taskId: string) => Promise<void>;
}

export function TodayLogsWidget({
  logs,
  projects,
  tasks,
  onDeleteLog,
  onResumeTask
}: TodayLogsWidgetProps) {
  // Filter and sort logs for today
  const todayLogs = useMemo(() => {
    const todayStr = toDateKey(new Date());
    return logs
      .filter((log) => {
        const logDate = new Date(log.startTime);
        return toDateKey(logDate) === todayStr;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [logs]);

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
      <div className="flex h-full flex-col items-center justify-center min-h-[220px] text-center p-4">
        <Clock className="size-8 text-muted-foreground/45 mb-2" />
        <p className="text-xs text-muted-foreground">
          No time tracked yet today. Hit start and get going.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-h-[220px]">
      {todayLogs.map((log) => {
        const task = tasks.find((t) => t.id === log.taskId);
        const project = task ? projects.find((p) => p.id === task.projectId) : null;
        const projectName = project?.name ?? "No Project";
        const projectColor = project?.color ?? "var(--muted)";

        return (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/20 transition-all text-xs gap-3 min-w-0"
          >
            {/* Project & Task Details */}
            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <ProjectColorDot color={projectColor} size="sm" className="shrink-0" />
                <span className="font-semibold text-foreground truncate max-w-[120px]">
                  {projectName}
                </span>
                <span className="text-muted-foreground/40 shrink-0">&bull;</span>
                <span className="text-muted-foreground truncate">{task?.taskName ?? "Other"}</span>
                {task?.categoryName ? (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {task.categoryName}
                  </span>
                ) : null}
              </div>
              {log.description && (
                <p className="text-[11px] text-muted-foreground truncate font-normal pl-4">
                  {log.description}
                </p>
              )}
              <div className="text-[10px] text-muted-foreground/60 pl-4 font-mono">
                {formatTime(log.startTime)} - {formatTime(log.endTime)}
              </div>
            </div>

            {/* Duration & Quick Actions */}
            <div className="flex items-center gap-2.5 shrink-0 pl-1">
              <span className="font-mono font-semibold text-foreground">
                {formatDuration(log.durationSec)}
              </span>
              <div className="flex items-center gap-1 border-l border-border/40 pl-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:bg-primary/10 rounded"
                  onClick={() => void onResumeTask(log.taskId)}
                  title="Restart timer for this task"
                >
                  <Play className="size-3.5 fill-current" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/15 rounded"
                  onClick={() => void onDeleteLog(log.id)}
                  title="Delete time entry"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TodayLogsWidget;
