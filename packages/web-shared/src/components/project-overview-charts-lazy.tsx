"use client";

import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

function ChartSkeleton({ className = "min-h-[220px]" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-md ${className}`} />;
}

export const ProjectOverviewTaskBarChart = dynamic(
  () =>
    import("./project-overview-charts").then((m) => ({
      default: m.ProjectOverviewTaskBarChart
    })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const ProjectOverviewDistributionDonut = dynamic(
  () =>
    import("./project-overview-charts").then((m) => ({
      default: m.ProjectOverviewDistributionDonut
    })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
