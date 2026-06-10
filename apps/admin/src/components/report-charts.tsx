"use client";

import type { DashboardReportDto } from "@kloqra/contracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Label,
  ProjectNameWithColor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@kloqra/ui/chart";
import { useClientTablePagination } from "@kloqra/web-shared";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from "recharts";

const billableChartConfig = {
  billableHours: { label: "Billable", color: "hsl(142 76% 36%)" },
  nonBillableHours: { label: "Non-billable", color: "hsl(215 16% 72%)" }
} satisfies ChartConfig;

const CHART_PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 58%)",
  "hsl(0 84% 60%)",
  "hsl(187 85% 43%)",
  "hsl(215 16% 55%)"
];

export type ChartByMode = "billability" | "project";
export type GroupByMode = "user" | "project" | "category";

export function formatChartDay(dateIso: string) {
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

/** Clockify-style duration: hours as H:MM */
export function formatDurationClock(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type DailyBarChartProps = {
  report: DashboardReportDto;
  chartBy: ChartByMode;
  projectColors: Record<string, string>;
};

export function DailyStackedBarChart({ report, chartBy, projectColors }: DailyBarChartProps) {
  const topProjects = report.timeByProject.slice(0, 6);

  const projectChartConfig = useMemo(() => {
    const cfg: ChartConfig = { ...billableChartConfig };
    topProjects.forEach((p, i) => {
      const key = `p_${p.projectId}`;
      cfg[key] = {
        label: p.projectName,
        color: projectColors[p.projectId] ?? CHART_PALETTE[i % CHART_PALETTE.length]
      };
    });
    return cfg;
  }, [topProjects, projectColors]);

  const billabilityData = useMemo(
    () =>
      report.dailyHours.map((d) => ({
        ...d,
        label: formatChartDay(d.date),
        totalLabel: `${d.totalHours.toFixed(2)}h`
      })),
    [report.dailyHours]
  );

  const projectData = useMemo(() => {
    return report.dailyHours.map((day) => {
      const projRow = report.dailyByProject.find((d) => d.date === day.date);
      const row: Record<string, string | number> = {
        date: day.date,
        label: formatChartDay(day.date),
        totalHours: day.totalHours,
        totalLabel: `${day.totalHours.toFixed(2)}h`
      };
      for (const p of topProjects) {
        const stack = projRow?.stacks.find((s) => s.projectId === p.projectId);
        row[`p_${p.projectId}`] = stack?.hours ?? 0;
      }
      return row;
    });
  }, [report.dailyHours, report.dailyByProject, topProjects]);

  if (report.dailyHours.length === 0) {
    return <ChartEmptyHint />;
  }

  if (chartBy === "billability") {
    return (
      <ChartContainer config={billableChartConfig} className="min-h-[320px] w-full">
        <BarChart data={billabilityData} accessibilityLayer margin={{ top: 24 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} unit="h" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="billableHours"
            stackId="stack"
            fill="var(--color-billableHours)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="nonBillableHours"
            stackId="stack"
            fill="var(--color-nonBillableHours)"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="totalLabel"
              position="top"
              className="fill-foreground text-xs font-medium"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  if (topProjects.length === 0) {
    return <ChartEmptyHint />;
  }

  return (
    <ChartContainer config={projectChartConfig} className="min-h-[320px] w-full">
      <BarChart data={projectData} accessibilityLayer margin={{ top: 24 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} unit="h" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {topProjects.map((p, i) => (
          <Bar
            key={p.projectId}
            dataKey={`p_${p.projectId}`}
            stackId="stack"
            fill={projectColors[p.projectId] ?? CHART_PALETTE[i % CHART_PALETTE.length]}
            radius={i === topProjects.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          >
            {i === topProjects.length - 1 ? (
              <LabelList
                dataKey="totalLabel"
                position="top"
                className="fill-foreground text-xs font-medium"
              />
            ) : null}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}

type DonutProps = {
  report: DashboardReportDto;
  groupBy: GroupByMode;
  projectColors: Record<string, string>;
};

export function ReportDonutChart({ report, groupBy, projectColors }: DonutProps) {
  const segments = useMemo(() => {
    const rows =
      groupBy === "user"
        ? report.timeByUser.map((u) => ({
            id: u.userId,
            name: u.userName,
            hours: u.totalHours,
            amount: u.billableAmount
          }))
        : groupBy === "category"
          ? report.timeByCategory.map((c) => ({
              id: c.categoryId,
              name: c.categoryName,
              hours: c.totalHours,
              amount: c.billableAmount
            }))
          : report.timeByProject.map((p) => ({
              id: p.projectId,
              name: p.projectName,
              hours: p.totalHours,
              amount: p.billableAmount
            }));

    const top = rows.slice(0, 6);
    const restHours = rows.slice(6).reduce((s, r) => s + r.hours, 0);
    const restAmount = rows.slice(6).reduce((s, r) => s + r.amount, 0);

    const data = top.map((r, i) => ({
      id: r.id,
      name: r.name,
      value: r.hours,
      amount: r.amount,
      fill:
        groupBy === "project"
          ? (projectColors[r.id] ?? CHART_PALETTE[i % CHART_PALETTE.length])
          : CHART_PALETTE[i % CHART_PALETTE.length]
    }));

    if (restHours > 0) {
      data.push({
        id: "other",
        name: "Other",
        value: restHours,
        amount: restAmount,
        fill: "hsl(215 16% 75%)"
      });
    }
    return data;
  }, [report, groupBy, projectColors]);

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    segments.forEach((s, i) => {
      cfg[s.name] = { label: s.name, color: s.fill ?? CHART_PALETTE[i % CHART_PALETTE.length] };
    });
    return cfg;
  }, [segments]);

  const totalHours = report.workspace.totalHours;
  const totalAmount = report.workspace.totalAmount;

  if (segments.length === 0) {
    return <ChartEmptyHint />;
  }

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <ChartContainer config={chartConfig} className="mx-auto min-h-[280px] w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const amt = (item.payload as { amount?: number }).amount ?? 0;
                  return (
                    <span>
                      {Number(value).toFixed(2)}h · ${formatMoney(amt)}
                    </span>
                  );
                }}
              />
            }
          />
          <Pie
            data={segments}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="88%"
            strokeWidth={2}
            paddingAngle={1}
          >
            {segments.map((entry) => (
              <Cell key={entry.id} fill={entry.fill} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-bold tabular-nums">{formatDurationClock(totalHours)}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{formatMoney(totalAmount)} USD</p>
      </div>
    </div>
  );
}

type BreakdownProps = {
  report: DashboardReportDto;
  groupBy: GroupByMode;
  projectColors: Record<string, string>;
};

export function ReportBreakdownTable({ report, groupBy, projectColors }: BreakdownProps) {
  const rows =
    groupBy === "user"
      ? report.timeByUser.map((u) => ({
          id: u.userId,
          title: u.userName,
          color: undefined as string | undefined,
          hours: u.totalHours,
          amount: u.billableAmount
        }))
      : groupBy === "category"
        ? report.timeByCategory.map((c) => ({
            id: c.categoryId,
            title: c.categoryName,
            color: undefined as string | undefined,
            hours: c.totalHours,
            amount: c.billableAmount
          }))
        : report.timeByProject.map((p) => ({
            id: p.projectId,
            title: p.projectName,
            color: projectColors[p.projectId],
            hours: p.totalHours,
            amount: p.billableAmount
          }));

  const { page, setPage, pageItems, total, totalPages, limit } = useClientTablePagination(rows, 10);

  return (
    <div className="space-y-0">
      <Table>
        <TableHeader>
          <DataTableHeaderRow>
            <DataTableHead>Title</DataTableHead>
            <DataTableHead className="text-right">Duration</DataTableHead>
            <DataTableHead className="text-right">Amount</DataTableHead>
          </DataTableHeaderRow>
        </TableHeader>
        <TableBody>
          {pageItems.length === 0 ? (
            <TableRow>
              <DataTableCell colSpan={3} className="text-muted-foreground">
                No data in this period
              </DataTableCell>
            </TableRow>
          ) : (
            pageItems.map((r) => (
              <TableRow key={r.id}>
                <DataTableCell className="font-medium">
                  {r.color ? <ProjectNameWithColor name={r.title} color={r.color} /> : r.title}
                </DataTableCell>
                <DataTableCell className="text-right tabular-nums">
                  {formatDurationClock(r.hours)}
                </DataTableCell>
                <DataTableCell className="text-right tabular-nums">
                  {formatMoney(r.amount)} USD
                </DataTableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {totalPages > 1 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

type ReportVisualsSectionProps = {
  report: DashboardReportDto;
  projectColors: Record<string, string>;
};

export function ReportVisualsSection({ report, projectColors }: ReportVisualsSectionProps) {
  const [chartBy, setChartBy] = useState<ChartByMode>("billability");
  const [groupBy, setGroupBy] = useState<GroupByMode>("user");

  return (
    <>
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Time tracked</CardTitle>
            <CardDescription>Daily hours — stack by billability or top projects</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Chart by</Label>
            <Select value={chartBy} onValueChange={(v) => setChartBy(v as ChartByMode)}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="billability">Billability</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DailyStackedBarChart report={report} chartBy={chartBy} projectColors={projectColors} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Breakdown</CardTitle>
              <CardDescription>Duration and billable amount per row</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Group by</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByMode)}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-auto">
            <ReportBreakdownTable report={report} groupBy={groupBy} projectColors={projectColors} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribution</CardTitle>
            <CardDescription>Share of time in this period</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportDonutChart report={report} groupBy={groupBy} projectColors={projectColors} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ChartEmptyHint() {
  return (
    <p className="text-sm text-muted-foreground py-8 text-center">No time logged in this period.</p>
  );
}
