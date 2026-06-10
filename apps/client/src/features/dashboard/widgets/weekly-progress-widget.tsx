"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, XAxis, YAxis } from "recharts";
import { toDateKey } from "@/features/timesheet/calendar-utils";

interface WeeklyProgressWidgetProps {
  logs: TimeLogDto[];
  startDate: string;
  endDate: string;
}

const chartConfig = {
  billable: { label: "Billable Hours", color: "var(--chart-1)" },
  nonBillable: { label: "Non-billable Hours", color: "var(--chart-2)" }
} satisfies ChartConfig;

export function WeeklyProgressWidget({ logs, startDate, endDate }: WeeklyProgressWidgetProps) {
  const chartData = useMemo(() => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59.999");
    const days: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return days.map((dayDate) => {
      const dateKey = toDateKey(dayDate);

      // Find logs for this specific date
      const dayLogs = logs.filter((log) => {
        const logDate = new Date(log.startTime);
        return toDateKey(logDate) === dateKey;
      });

      let billableHours = 0;
      let nonBillableHours = 0;

      for (const log of dayLogs) {
        const hours = log.durationSec / 3600;
        if (log.isBillable) {
          billableHours += hours;
        } else {
          nonBillableHours += hours;
        }
      }

      // X-Axis label format: if 7 days or less, show weekday name. Otherwise show month/day
      const showShortDate = days.length > 7;
      const dayName = showShortDate
        ? dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : dayDate.toLocaleDateString(undefined, { weekday: "short" });

      return {
        dayName,
        billable: Math.round(billableHours * 100) / 100,
        nonBillable: Math.round(nonBillableHours * 100) / 100
      };
    });
  }, [logs, startDate, endDate]);

  return (
    <div className="flex h-full flex-col justify-center min-h-[200px] min-w-0">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart data={chartData} accessibilityLayer margin={{ bottom: 5, left: -20 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="dayName"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            label={{
              value: "Hours",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 10, fill: "var(--muted-foreground)" }
            }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
          <ReferenceLine
            y={8}
            stroke="var(--destructive)"
            strokeDasharray="4 4"
            label={{
              value: "8h Goal",
              position: "insideTopRight",
              fill: "var(--destructive)",
              fontSize: 9,
              fontWeight: "bold"
            }}
          />
          <Bar dataKey="billable" stackId="day" fill="var(--color-billable)" />
          <Bar
            dataKey="nonBillable"
            stackId="day"
            fill="var(--color-nonBillable)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export default WeeklyProgressWidget;
