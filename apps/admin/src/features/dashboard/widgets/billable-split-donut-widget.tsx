"use client";

import type { DashboardReportDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import React from "react";
import { Cell, Legend, Pie, PieChart } from "recharts";
import { formatDurationClock } from "@/components/report-charts";

interface BillableSplitDonutWidgetProps {
  report: DashboardReportDto;
}

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
    <div className="flex h-full flex-col justify-center relative min-h-[200px] min-w-0">
      <div className="w-full flex-1 relative min-h-[140px]">
        <ChartContainer config={chartConfig} className="mx-auto h-full w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              strokeWidth={2}
              paddingAngle={1}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center pb-6">
          <p className="text-xl font-bold tracking-tight">{formatDurationClock(total)}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Total Hours
          </p>
        </div>
      </div>
    </div>
  );
}

export default BillableSplitDonutWidget;
