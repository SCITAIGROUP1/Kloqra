"use client";

import type { DashboardReportDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  DonutChartCenter,
  DonutLegend,
  type ChartConfig
} from "@kloqra/ui/chart";
import React from "react";
import { Cell, Pie, PieChart } from "recharts";
import { formatDurationClock } from "@/components/report-charts";

export type BillableSplitDonutWidgetProps = {
  report: DashboardReportDto;
};

const chartConfig = {
  billable: { label: "Billable Hours", color: "hsl(142 76% 36%)" },
  nonBillable: { label: "Non-billable Hours", color: "hsl(215 16% 72%)" }
} satisfies ChartConfig;

export function BillableSplitDonutWidget({ report }: BillableSplitDonutWidgetProps) {
  const billable = report.workspace.billableHours;
  const nonBillable = report.workspace.nonBillableHours;
  const total = report.workspace.totalHours;

  const data = [
    { name: "Billable", value: billable, fill: "hsl(142 76% 36%)" },
    { name: "Non-billable", value: nonBillable, fill: "hsl(215 16% 72%)" }
  ];

  return (
    <DonutChartCenter
      className="h-full min-h-[200px] justify-center"
      chart={
        <ChartContainer config={chartConfig} className="aspect-square h-full w-full min-h-0">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              strokeWidth={2}
              paddingAngle={1}
              cx="50%"
              cy="50%"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      }
      center={
        <>
          <p className="text-xl font-bold tracking-tight">{formatDurationClock(total)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Hours
          </p>
        </>
      }
      legend={
        <DonutLegend
          items={data.map((entry, index) => ({
            key: String(index),
            label: entry.name,
            color: entry.fill
          }))}
        />
      }
    />
  );
}

export default BillableSplitDonutWidget;
