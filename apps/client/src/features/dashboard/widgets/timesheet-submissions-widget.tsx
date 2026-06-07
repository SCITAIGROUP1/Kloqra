"use client";

import type { TimesheetPeriodDto, ProjectDto } from "@chronomint/contracts";
import { Badge, ProjectColorDot } from "@chronomint/ui";
import { ListTodo } from "lucide-react";
import React from "react";
import { formatWeekRange } from "@/features/timesheet/calendar-utils";

interface TimesheetSubmissionsWidgetProps {
  submissions: TimesheetPeriodDto[];
  projects: ProjectDto[];
}

export function TimesheetSubmissionsWidget({
  submissions,
  projects
}: TimesheetSubmissionsWidgetProps) {
  function formatPeriod(start: string) {
    const d = new Date(start);
    return formatWeekRange(d);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20 font-medium text-[10px] uppercase tracking-wider py-0.5 px-2">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/15 border-destructive/20 font-medium text-[10px] uppercase tracking-wider py-0.5 px-2">
            Rejected
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 border-blue-500/20 font-medium text-[10px] uppercase tracking-wider py-0.5 px-2">
            Submitted
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 border-border font-medium text-[10px] uppercase tracking-wider py-0.5 px-2">
            Draft
          </Badge>
        );
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center min-h-[200px] text-center p-4">
        <ListTodo className="size-8 text-muted-foreground/45 mb-2" />
        <p className="text-xs text-muted-foreground">No timesheet submissions found.</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Submit your timesheets from the Timesheets tab.
        </p>
      </div>
    );
  }

  // Display top 5 submissions
  const itemsToShow = submissions.slice(0, 5);

  return (
    <div className="w-full overflow-x-auto min-h-[200px]">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60 text-muted-foreground font-semibold">
            <th className="py-2.5 px-3">Period</th>
            <th className="py-2.5 px-3">Project</th>
            <th className="py-2.5 px-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {itemsToShow.map((sub) => {
            const project = projects.find((p) => p.id === sub.projectId);
            const projectName = project?.name ?? sub.projectName ?? "No Project";
            const projectColor = project?.color ?? "var(--muted)";

            return (
              <tr
                key={sub.id}
                className="border-b border-border/40 hover:bg-muted/10 transition-colors"
              >
                <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                  {formatPeriod(sub.periodStart)}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                    <ProjectColorDot color={projectColor} size="sm" className="shrink-0" />
                    <span className="truncate">{projectName}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">{getStatusBadge(sub.status)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TimesheetSubmissionsWidget;
