"use client";

import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

function WidgetSkeleton({
  className = "min-h-[280px]",
  style
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <Skeleton style={style} className={`w-full rounded-md ${className}`} />;
}

export const WeeklyProgressWidget = dynamic(
  () =>
    import("./widgets/weekly-progress-widget").then((m) => ({
      default: m.WeeklyProgressWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[220px]" /> }
);

export const ProjectSplitWidget = dynamic(
  () =>
    import("./widgets/project-split-widget").then((m) => ({
      default: m.ProjectSplitWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[200px]" /> }
);

export const CategorySplitWidget = dynamic(
  () =>
    import("./widgets/category-split-widget").then((m) => ({
      default: m.CategorySplitWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[200px]" /> }
);

export const TimesheetSubmissionsWidget = dynamic(
  () =>
    import("./widgets/timesheet-submissions-widget").then((m) => ({
      default: m.TimesheetSubmissionsWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[180px]" /> }
);

export const TodayLogsWidget = dynamic(
  () =>
    import("./widgets/today-logs-widget").then((m) => ({
      default: m.TodayLogsWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[240px]" /> }
);

export const TeamActivitiesWidget = dynamic(
  () =>
    import("./widgets/team-activities-widget").then((m) => ({
      default: m.TeamActivitiesWidget
    })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[280px]" /> }
);

export { DailyGoalWidget, QuickActions } from "@/features/timer/timer-dynamic-widgets";
