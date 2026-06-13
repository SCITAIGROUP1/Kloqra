"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/chart-skeleton";

function WidgetSkeleton({ className = "min-h-[220px]" }: { className?: string }) {
  return <ChartSkeleton className={className} />;
}

export const BudgetBurnDownWidget = dynamic(
  () =>
    import("./budget-burndown-widget").then((m) => ({
      default: m.BudgetBurnDownWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[260px]" /> }
);

export const TeamUtilizationWidget = dynamic(
  () =>
    import("./team-utilization-widget").then((m) => ({
      default: m.TeamUtilizationWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[260px]" /> }
);

export const ActiveTimersWidget = dynamic(
  () =>
    import("./widgets/active-timers-widget").then((m) => ({
      default: m.ActiveTimersWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

export const BillabilityGaugeWidget = dynamic(
  () =>
    import("./widgets/billability-gauge-widget").then((m) => ({
      default: m.BillabilityGaugeWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[200px]" /> }
);

export const BillableSplitDonutWidget = dynamic(
  () =>
    import("./widgets/billable-split-donut-widget").then((m) => ({
      default: m.BillableSplitDonutWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[200px]" /> }
);

export const CategoryProjectHeatmapWidget = dynamic(
  () =>
    import("./widgets/category-project-heatmap-widget").then((m) => ({
      default: m.CategoryProjectHeatmapWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[240px]" /> }
);

export const HeatmapWidget = dynamic(
  () =>
    import("./widgets/heatmap-widget").then((m) => ({
      default: m.HeatmapWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[240px]" /> }
);

export const HourlyRatesWidget = dynamic(
  () =>
    import("./widgets/hourly-rates-widget").then((m) => ({
      default: m.HourlyRatesWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

export const LivePresenceWidget = dynamic(
  () =>
    import("./widgets/live-presence-widget").then((m) => ({
      default: m.LivePresenceWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

export const MemberLeaderboardWidget = dynamic(
  () =>
    import("./widgets/member-leaderboard-widget").then((m) => ({
      default: m.MemberLeaderboardWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

export const PendingTimesheetsWidget = dynamic(
  () =>
    import("./widgets/pending-timesheets-widget").then((m) => ({
      default: m.PendingTimesheetsWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

export const ProjectHealthWidget = dynamic(
  () =>
    import("./widgets/project-health-widget").then((m) => ({
      default: m.ProjectHealthWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton /> }
);

export const RateEfficiencyWidget = dynamic(
  () =>
    import("./widgets/rate-efficiency-widget").then((m) => ({
      default: m.RateEfficiencyWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[240px]" /> }
);

export const RevenueTrendWidget = dynamic(
  () =>
    import("./widgets/revenue-trend-widget").then((m) => ({
      default: m.RevenueTrendWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[220px]" /> }
);

export const TaskBreakdownWidget = dynamic(
  () =>
    import("./widgets/task-breakdown-widget").then((m) => ({
      default: m.TaskBreakdownWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[200px]" /> }
);
