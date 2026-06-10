"use client";

import type { DashboardReportDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface RevenueTrendWidgetProps {
  report: DashboardReportDto;
}

const chartConfig = {
  billableAmount: { label: "Revenue", color: "hsl(221 83% 53%)" }
} satisfies ChartConfig;

function formatWeekLabel(weekStartStr: string) {
  const date = new Date(`${weekStartStr}T12:00:00Z`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCurrency(val: number) {
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function RevenueTrendWidget({ report }: RevenueTrendWidgetProps) {
  if (!report.weeklyHours || report.weeklyHours.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground py-8">
        No weekly revenue data available.
      </div>
    );
  }

  // Format data for chart
  const data = report.weeklyHours.map((w) => ({
    week: formatWeekLabel(w.weekStart),
    // Safe check since typescript knows it's a number now
    billableAmount: (w as any).billableAmount || 0,
    rawDate: w.weekStart
  }));

  return (
    <div className="w-full h-full min-h-[220px] min-w-0">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueTrendColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={formatCurrency}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span className="font-semibold text-foreground">
                    ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="billableAmount"
            stroke="hsl(221 83% 53%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueTrendColor)"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export default RevenueTrendWidget;
