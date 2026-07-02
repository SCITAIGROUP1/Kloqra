"use client";

import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

function WidgetSkeleton({ className = "min-h-[160px]" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

/** Single dynamic boundary for timer widgets — avoid duplicate loaders (Turbopack chunk 404s). */
export const DailyGoalWidget = dynamic(
  () => import("./daily-goal-widget").then((m) => ({ default: m.DailyGoalWidget })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[200px]" /> }
);

export const QuickActions = dynamic(
  () => import("./quick-actions").then((m) => ({ default: m.QuickActions })),
  { ssr: false, loading: () => <WidgetSkeleton className="min-h-[180px]" /> }
);

export const StaleTimerDialog = dynamic(
  () => import("./stale-timer-dialog").then((m) => ({ default: m.StaleTimerDialog })),
  { ssr: false, loading: () => null }
);
