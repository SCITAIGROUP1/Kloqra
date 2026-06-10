"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

export const ReportVisualsSection = dynamic(
  () => import("./report-charts").then((m) => ({ default: m.ReportVisualsSection })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const DashboardExtraCharts = dynamic(
  () => import("./dashboard-extra-charts").then((m) => ({ default: m.DashboardExtraCharts })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[260px]" /> }
);

// Individual dynamic exports for widgets
export const DailyStackedBarChart = dynamic(
  () => import("./report-charts").then((m) => ({ default: m.DailyStackedBarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const ReportDonutChart = dynamic(
  () => import("./report-charts").then((m) => ({ default: m.ReportDonutChart })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[200px]" /> }
);

export const ReportBreakdownTable = dynamic(
  () => import("./report-charts").then((m) => ({ default: m.ReportBreakdownTable })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[200px]" /> }
);

export const WeeklyBarChart = dynamic(
  () => import("./dashboard-extra-charts").then((m) => ({ default: m.WeeklyBarChart })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[220px]" /> }
);

export const WeeklyActivityChart = dynamic(
  () => import("./weekly-activity-chart").then((m) => ({ default: m.WeeklyActivityChart })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[220px]" /> }
);

export const RevenueByProjectChart = dynamic(
  () => import("./dashboard-extra-charts").then((m) => ({ default: m.RevenueByProjectChart })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[220px]" /> }
);

export const HoursByMemberChart = dynamic(
  () => import("./dashboard-extra-charts").then((m) => ({ default: m.HoursByMemberChart })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[220px]" /> }
);
