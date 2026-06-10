"use client";

import type { TimeLogDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import React, { useMemo } from "react";
import { Cell, Legend, Pie, PieChart } from "recharts";

interface ProjectSplitWidgetProps {
  logs: TimeLogDto[];
  projects: ProjectDto[];
  tasks: TaskDto[];
}

export function ProjectSplitWidget({ logs, projects, tasks }: ProjectSplitWidgetProps) {
  // Aggregate hours by project directly from logs props

  // Aggregate hours by project
  const { chartData, totalHours, chartConfig } = useMemo(() => {
    const projectHoursMap: Record<string, number> = {};

    for (const log of logs) {
      const task = tasks.find((t) => t.id === log.taskId);
      const projectId = task?.projectId ?? "unknown";
      const hours = log.durationSec / 3600;
      projectHoursMap[projectId] = (projectHoursMap[projectId] ?? 0) + hours;
    }

    let total = 0;
    const config: ChartConfig = {};
    const data = Object.keys(projectHoursMap).map((projectId, idx) => {
      const project = projects.find((p) => p.id === projectId);
      const name = project?.name ?? (projectId === "unknown" ? "No Project" : "Other Project");
      const color = project?.color ?? "var(--muted)";
      const value = Math.round(projectHoursMap[projectId]! * 100) / 100;
      total += value;

      const configKey = `project_${idx}`;
      config[configKey] = { label: name, color };

      return {
        name,
        value,
        fill: color,
        configKey
      };
    });

    return {
      chartData: data,
      totalHours: Math.round(total * 10) / 10,
      chartConfig: config
    };
  }, [logs, projects, tasks]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center min-h-[200px]">
        <p className="text-xs text-muted-foreground text-center">No time logged in this period</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center relative min-h-[200px] min-w-0">
      <div className="w-full flex-1 relative min-h-[140px]">
        <ChartContainer config={chartConfig} className="mx-auto h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              strokeWidth={2}
              paddingAngle={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 9 }} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center pb-3">
          <p className="text-xl font-bold tracking-tight">{totalHours}h</p>
          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
            Total Logged
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProjectSplitWidget;
