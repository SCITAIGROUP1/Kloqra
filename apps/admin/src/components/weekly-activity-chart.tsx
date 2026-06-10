"use client";

import type { DashboardReportDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

const chartConfig = {
  totalHours: { label: "Hours", color: "var(--primary)" }
} satisfies ChartConfig;

function dayLabel(dateIso: string) {
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short" });
}

export function WeeklyActivityChart({ report }: { report: DashboardReportDto }) {
  const { data, peakHours } = useMemo(() => {
    const rows = report.dailyHours.map((row) => ({
      ...row,
      day: dayLabel(row.date)
    }));
    const peak = rows.reduce((max, row) => Math.max(max, row.totalHours), 0);
    return { data: rows, peakHours: peak };
  }, [report.dailyHours]);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No activity in this period.</p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full min-h-[220px]">
      <BarChart data={data} accessibilityLayer margin={{ bottom: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toFixed(1)}h`, "Logged"]}
            />
          }
        />
        <Bar dataKey="totalHours" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell
              key={entry.date}
              fill={
                entry.totalHours === peakHours && peakHours > 0
                  ? "var(--primary)"
                  : "color-mix(in oklch, var(--primary) 35%, transparent)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
