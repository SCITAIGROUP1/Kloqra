"use client";

import type { DashboardReportDto } from "@chronomint/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@chronomint/ui/chart";
import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

interface MemberLeaderboardWidgetProps {
  report: DashboardReportDto;
}

const chartConfig = {
  billableHours: { label: "Billable", color: "hsl(142 76% 36%)" },
  nonBillableHours: { label: "Non-billable", color: "hsl(215 16% 72%)" }
} satisfies ChartConfig;

export function MemberLeaderboardWidget({ report }: MemberLeaderboardWidgetProps) {
  if (!report.timeByUser || report.timeByUser.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-8">
        No team member data available.
      </div>
    );
  }

  // Sort descending by totalHours (should already be sorted, but enforce it)
  const sortedData = [...report.timeByUser]
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 8) // Limit to top 8 active members
    .map((u) => ({
      name: u.userName,
      billableHours: u.billableHours,
      nonBillableHours: u.nonBillableHours,
      totalHours: u.totalHours
    }));

  return (
    <div className="w-full h-full min-h-[220px] min-w-0">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
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
            width={75}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="billableHours" stackId="l" fill="var(--color-billableHours)" />
          <Bar
            dataKey="nonBillableHours"
            stackId="l"
            fill="var(--color-nonBillableHours)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export default MemberLeaderboardWidget;
