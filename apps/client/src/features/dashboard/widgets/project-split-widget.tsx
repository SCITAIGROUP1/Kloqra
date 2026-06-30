"use client";

import type { TimeLogDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  DonutChartCenter,
  type ChartConfig
} from "@kloqra/ui/chart";
import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { DistributionLegendTable } from "./distribution-legend-table";
import { buildProjectDistributionData } from "./project-split-data";

export type ProjectSplitWidgetProps = {
  logs: TimeLogDto[];
  projects: ProjectDto[];
  tasks: TaskDto[];
};

export function ProjectSplitWidget({ logs, projects, tasks }: ProjectSplitWidgetProps) {
  const { rows, chartRows, totalHours } = useMemo(
    () => buildProjectDistributionData(logs, projects, tasks),
    [logs, projects, tasks]
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of chartRows) {
      config[row.configKey] = { label: row.projectName, color: row.fill };
    }
    return config;
  }, [chartRows]);

  if (chartRows.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <p className="text-center text-xs text-muted-foreground">No time logged in this period</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[220px] min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
      <div className="min-h-[10rem] w-full shrink-0 sm:min-h-0 sm:h-auto sm:max-w-[44%] sm:flex-1">
        <DonutChartCenter
          chartClassName="max-w-none"
          chart={
            <ChartContainer config={chartConfig} className="aspect-square h-full w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={chartRows}
                    dataKey="value"
                    nameKey="projectName"
                    innerRadius="62%"
                    outerRadius="88%"
                    strokeWidth={2}
                    paddingAngle={1}
                    cx="50%"
                    cy="50%"
                  >
                    {chartRows.map((entry) => (
                      <Cell key={entry.configKey} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          }
          center={
            <>
              <p className="text-base font-bold tracking-tight sm:text-lg md:text-xl">
                {totalHours}h
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Logged
              </p>
            </>
          }
        />
      </div>

      <DistributionLegendTable rows={rows} />
    </div>
  );
}

export default ProjectSplitWidget;
