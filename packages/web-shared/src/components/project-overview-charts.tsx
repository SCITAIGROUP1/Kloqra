"use client";

import type { ProjectSummaryDto } from "@kloqra/contracts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@kloqra/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  DonutChartCenter,
  DonutLegend,
  type ChartConfig
} from "@kloqra/ui/chart";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  buildProjectOverviewDistributionDonutData,
  buildProjectOverviewTaskBarData,
  formatOverviewHours,
  type ProjectOverviewDistributionGroupBy
} from "./project-overview-chart-data";

const taskBarConfig = {
  billableHours: { label: "Billable", color: "hsl(142 76% 36%)" },
  nonBillableHours: { label: "Non-billable", color: "hsl(215 16% 72%)" }
} satisfies ChartConfig;

const DISTRIBUTION_GROUP_LABELS: Record<ProjectOverviewDistributionGroupBy, string> = {
  member: "Member",
  project: "Project",
  category: "Category"
};

type ProjectOverviewTaskBarChartProps = {
  rows: ProjectSummaryDto["byTask"];
};

export function ProjectOverviewTaskBarChart({ rows }: ProjectOverviewTaskBarChartProps) {
  const chartData = useMemo(() => buildProjectOverviewTaskBarData(rows), [rows]);

  if (chartData.length === 0) {
    return (
      <p className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        No time logged in this period.
      </p>
    );
  }

  return (
    <div className="min-h-[220px] w-full min-w-0">
      <ChartContainer config={taskBarConfig} className="h-[220px] w-full">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            unit="h"
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            width={110}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="billableHours" stackId="hours" fill="var(--color-billableHours)" />
          <Bar
            dataKey="nonBillableHours"
            stackId="hours"
            fill="var(--color-nonBillableHours)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

type ProjectOverviewDistributionDonutProps = {
  summary: ProjectSummaryDto;
};

export function ProjectOverviewDistributionDonut({
  summary
}: ProjectOverviewDistributionDonutProps) {
  const [groupBy, setGroupBy] = useState<ProjectOverviewDistributionGroupBy>("category");

  const { chartData, chartConfig } = useMemo(() => {
    const data = buildProjectOverviewDistributionDonutData(summary, groupBy);
    const config: ChartConfig = {};
    for (const row of data) {
      config[row.configKey] = { label: row.name, color: row.fill };
    }
    return { chartData: data, chartConfig: config };
  }, [summary, groupBy]);

  if (summary.totalHours <= 0 || chartData.length === 0) {
    return (
      <p className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        No time logged in this period.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {DISTRIBUTION_GROUP_LABELS[groupBy]} split for logged time
        </p>
        <Select
          value={groupBy}
          onValueChange={(value) => setGroupBy(value as ProjectOverviewDistributionGroupBy)}
        >
          <SelectTrigger className="h-7 w-[7.5rem] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member" className="text-xs">
              Member
            </SelectItem>
            <SelectItem value="project" className="text-xs">
              Project
            </SelectItem>
            <SelectItem value="category" className="text-xs">
              Category
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DonutChartCenter
        chart={
          <ChartContainer config={chartConfig} className="aspect-square h-full w-full min-h-0">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="88%"
                strokeWidth={2}
                paddingAngle={1}
                cx="50%"
                cy="50%"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.configKey} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        }
        center={
          <>
            <p className="text-xl font-bold tabular-nums tracking-tight">
              {formatOverviewHours(summary.totalHours)}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Total
            </p>
          </>
        }
        legend={
          <DonutLegend
            items={chartData.map((entry) => ({
              key: entry.configKey,
              label: entry.name,
              color: entry.fill
            }))}
          />
        }
      />
    </div>
  );
}
