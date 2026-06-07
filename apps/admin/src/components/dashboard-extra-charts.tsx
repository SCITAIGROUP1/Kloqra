"use client";

import type { DashboardReportDto } from "@chronomint/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@chronomint/ui";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@chronomint/ui/chart";
import { Bar, BarChart, CartesianGrid, Cell, Legend, XAxis, YAxis } from "recharts";

const billableChartConfig = {
  billableHours: { label: "Billable", color: "hsl(var(--chart-1))" },
  nonBillableHours: { label: "Non-billable", color: "hsl(var(--chart-2))" }
} satisfies ChartConfig;

const revenueChartConfig = {
  billableAmount: { label: "Revenue", color: "hsl(var(--chart-3))" }
} satisfies ChartConfig;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type ChartProps = {
  report: DashboardReportDto;
  projectColors?: Record<string, string>;
};

export function WeeklyBarChart({ report }: ChartProps) {
  if (report.weeklyHours.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No weekly data</p>;
  }

  return (
    <ChartContainer config={billableChartConfig} className="h-full w-full min-h-[220px]">
      <BarChart data={report.weeklyHours} accessibilityLayer margin={{ bottom: 10 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="weekStart"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => formatDate(`${v}T12:00:00Z`)}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar dataKey="billableHours" stackId="w" fill="var(--color-billableHours)" />
        <Bar
          dataKey="nonBillableHours"
          stackId="w"
          fill="var(--color-nonBillableHours)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function RevenueByProjectChart({ report, projectColors = {} }: ChartProps) {
  if (report.timeByProject.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No project revenue</p>;
  }

  return (
    <ChartContainer config={revenueChartConfig} className="h-full w-full min-h-[220px]">
      <BarChart data={report.timeByProject} accessibilityLayer margin={{ bottom: 10 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="projectName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="billableAmount" radius={4}>
          {report.timeByProject.map((entry) => (
            <Cell
              key={entry.projectId}
              fill={projectColors[entry.projectId] ?? "var(--color-billableAmount)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function HoursByMemberChart({ report }: ChartProps) {
  if (report.timeByUser.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No member data</p>;
  }

  return (
    <ChartContainer config={billableChartConfig} className="h-full w-full min-h-[220px]">
      <BarChart data={report.timeByUser} accessibilityLayer margin={{ bottom: 10 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="userName"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar dataKey="billableHours" stackId="a" fill="var(--color-billableHours)" />
        <Bar
          dataKey="nonBillableHours"
          stackId="a"
          fill="var(--color-nonBillableHours)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

// Keep legacy wrapper component for backward compatibility during build phase
export function DashboardExtraCharts({ report, projectColors }: ChartProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly breakdown</CardTitle>
            <CardDescription>Billable vs non-billable by week</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyBarChart report={report} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by project</CardTitle>
            <CardDescription>Billable amount in period</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueByProjectChart report={report} projectColors={projectColors} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hours by member</CardTitle>
          <CardDescription>Stacked billable and non-billable hours</CardDescription>
        </CardHeader>
        <CardContent>
          <HoursByMemberChart report={report} />
        </CardContent>
      </Card>
    </div>
  );
}
