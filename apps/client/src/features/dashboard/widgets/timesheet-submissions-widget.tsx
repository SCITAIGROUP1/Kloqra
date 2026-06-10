"use client";

import type { TimesheetPeriodDto, ProjectDto } from "@kloqra/contracts";
import {
  Button,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  ProjectColorDot,
  Table,
  TableBody,
  TableHeader,
  TableRow,
  TimesheetApprovalStatusBadge
} from "@kloqra/ui";
import { ListTodo } from "lucide-react";
import Link from "next/link";
import React from "react";
import { countActionableSubmissions } from "@/features/approvals/use-my-submissions";
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

  const actionableCount = countActionableSubmissions(submissions);

  if (submissions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center min-h-[200px] text-center p-4">
        <ListTodo className="size-8 text-muted-foreground/45 mb-2" />
        <p className="text-xs text-muted-foreground">No timesheet submissions found.</p>
        <Button variant="link" size="sm" className="h-7 text-xs mt-2" asChild>
          <Link href="/approvals">Go to Approvals</Link>
        </Button>
      </div>
    );
  }

  const itemsToShow = submissions.slice(0, 5);

  return (
    <div className="flex flex-col h-full min-h-[200px]">
      {actionableCount > 0 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300 mb-2 px-1">
          {actionableCount} period{actionableCount === 1 ? "" : "s"} ready to send
        </p>
      )}
      <div className="w-full flex-1 overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <DataTableHeaderRow>
              <DataTableHead>Period</DataTableHead>
              <DataTableHead>Project</DataTableHead>
              <DataTableHead className="text-right">Status</DataTableHead>
            </DataTableHeaderRow>
          </TableHeader>
          <TableBody>
            {itemsToShow.map((sub) => {
              const project = projects.find((p) => p.id === sub.projectId);
              const projectName = project?.name ?? sub.projectName ?? "No Project";
              const projectColor = project?.color ?? "var(--muted)";

              return (
                <TableRow key={sub.id || `${sub.projectId}:${sub.periodStart}`}>
                  <DataTableCell className="whitespace-nowrap font-medium">
                    {formatPeriod(sub.periodStart)}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex max-w-[160px] items-center gap-1.5 truncate">
                      <ProjectColorDot color={projectColor} size="sm" className="shrink-0" />
                      <span className="truncate">{projectName}</span>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <TimesheetApprovalStatusBadge status={sub.status} />
                  </DataTableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="pt-2 mt-2 border-t border-border/40">
        <Button variant="ghost" size="sm" className="w-full h-7 text-[10px]" asChild>
          <Link href="/approvals">Go to Approvals</Link>
        </Button>
      </div>
    </div>
  );
}

export default TimesheetSubmissionsWidget;
