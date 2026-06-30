"use client";

import type { TaskDto, TimeLogDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  DonutChartCenter,
  DonutLegend,
  type ChartConfig
} from "@kloqra/ui/chart";
import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { buildCategorySplitData } from "./category-split-data";

export type CategorySplitWidgetProps = {
  logs: TimeLogDto[];
  tasks: TaskDto[];
  periodLabel: string;
};

export function CategorySplitWidget({ logs, tasks, periodLabel }: CategorySplitWidgetProps) {
  const { chartRows, totalHours } = useMemo(
    () => buildCategorySplitData(logs, tasks),
    [logs, tasks]
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of chartRows) {
      config[row.configKey] = { label: row.categoryName, color: row.fill };
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
    <DonutChartCenter
      className="h-full min-h-[200px] justify-center"
      chart={
        <ChartContainer config={chartConfig} className="aspect-square h-full w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartRows}
                dataKey="value"
                nameKey="name"
                innerRadius="65%"
                outerRadius="90%"
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
          <p className="text-xl font-bold tracking-tight">{totalHours}h</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {periodLabel}
          </p>
        </>
      }
      legend={
        <DonutLegend
          items={chartRows.map((entry) => ({
            key: entry.configKey,
            label: entry.categoryName,
            color: entry.fill
          }))}
        />
      }
    />
  );
}

export default CategorySplitWidget;
