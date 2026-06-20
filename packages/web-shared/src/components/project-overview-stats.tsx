"use client";

import type { ProjectSummaryDto } from "@kloqra/contracts";
import {
  DashboardStatCard,
  EmptyState,
  Skeleton,
  WidgetShell,
  cn,
  type DashboardStatTone
} from "@kloqra/ui";
import { Clock, DollarSign, ListTodo, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  applyDashboardPeriodPreset,
  matchDashboardPeriodPreset,
  localMidnightUtcInZone,
  type DashboardPeriodPreset
} from "../utils/dashboard-period-presets";
import {
  DashboardPeriodFilter,
  type DashboardPeriodFilterOption,
  type DashboardPeriodSelection
} from "./dashboard-period-filter";
import { formatOverviewHours } from "./project-overview-chart-data";
import {
  ProjectOverviewDistributionDonut,
  ProjectOverviewTaskBarChart
} from "./project-overview-charts-lazy";

const PERIOD_PRESETS: DashboardPeriodFilterOption[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" }
];

type KpiDef = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  icon: typeof Clock;
  tone: DashboardStatTone;
};

export type ProjectOverviewStatsProps = {
  mode: "admin" | "member";
  loadSummary: (from: string, to: string) => Promise<ProjectSummaryDto>;
  projectInceptionDate?: string;
  className?: string;
  timezone?: string;
};

export function ProjectOverviewStats({
  mode,
  loadSummary,
  projectInceptionDate,
  className,
  timezone
}: ProjectOverviewStatsProps) {
  const resolvedTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const initial = useMemo(
    () => applyDashboardPeriodPreset("all", resolvedTz, projectInceptionDate),
    [resolvedTz, projectInceptionDate]
  );
  const [range, setRange] = useState<DashboardPeriodSelection>("all");
  const [startDate, setStartDate] = useState(initial.from);
  const [endDate, setEndDate] = useState(initial.to);
  const [summary, setSummary] = useState<ProjectSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodLabel = mode === "admin" ? "Team time on this project" : "Your time on this project";

  useEffect(() => {
    if (range !== "custom") {
      const next = applyDashboardPeriodPreset(range, resolvedTz, projectInceptionDate);
      setStartDate(next.from);
      setEndDate(next.to);
    }
  }, [resolvedTz, range, projectInceptionDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const [fy, fm, fd] = startDate.split("-").map(Number);
    const [ty, tm, td] = endDate.split("-").map(Number);
    const from = localMidnightUtcInZone(fy, fm, fd, resolvedTz).toISOString();
    const to = new Date(
      localMidnightUtcInZone(ty, tm, td, resolvedTz).getTime() + 24 * 60 * 60 * 1000 - 1
    ).toISOString();
    void loadSummary(from, to)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load project summary.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, resolvedTz, loadSummary]);

  const kpis = useMemo<KpiDef[] | null>(() => {
    if (!summary) return null;
    return [
      {
        id: "project-kpi-total",
        label: "Total hours",
        value: formatOverviewHours(summary.totalHours),
        icon: Clock,
        tone: "primary"
      },
      {
        id: "project-kpi-billable",
        label: "Billable hours",
        value: formatOverviewHours(summary.billableHours),
        hint:
          summary.totalHours > 0
            ? `${Math.round((summary.billableHours / summary.totalHours) * 100)}% of total`
            : undefined,
        icon: DollarSign,
        tone: "success"
      },
      {
        id: "project-kpi-entries",
        label: "Entries",
        value: String(summary.entryCount),
        icon: Timer,
        tone: "warning"
      },
      {
        id: "project-kpi-tasks",
        label: "Tasks with time",
        value: String(summary.byTask.length),
        icon: ListTodo,
        tone: "premium"
      }
    ];
  }, [summary]);

  function handlePresetChange(preset: DashboardPeriodPreset) {
    setRange(preset);
    const next = applyDashboardPeriodPreset(preset, resolvedTz, projectInceptionDate);
    setStartDate(next.from);
    setEndDate(next.to);
  }

  function handleDateRangeChange(from: string, to: string) {
    setStartDate(from);
    setEndDate(to);
    setRange(
      matchDashboardPeriodPreset(
        from,
        to,
        PERIOD_PRESETS.map((p) => p.value as DashboardPeriodPreset),
        resolvedTz,
        projectInceptionDate
      ) ?? "custom"
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <DashboardPeriodFilter
        range={range}
        onPresetChange={handlePresetChange}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
        presets={PERIOD_PRESETS}
        dateRangeAriaLabel="Project overview period"
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <EmptyState title="Could not load overview" description={error} />
      ) : summary ? (
        <>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis?.map((kpi) => (
              <WidgetShell
                key={kpi.id}
                id={kpi.id}
                label={kpi.label}
                isEditing={false}
                showTitleInView={false}
              >
                <DashboardStatCard
                  label={kpi.label}
                  value={kpi.value}
                  hint={kpi.hint}
                  icon={kpi.icon}
                  tone={kpi.tone}
                />
              </WidgetShell>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <WidgetShell id="project-chart-tasks" label="By task" isEditing={false}>
              <p className="mb-3 text-xs text-muted-foreground">
                Hours logged per task in this period
              </p>
              <ProjectOverviewTaskBarChart rows={summary.byTask} />
            </WidgetShell>

            <WidgetShell id="project-chart-distribution" label="Distribution" isEditing={false}>
              <ProjectOverviewDistributionDonut summary={summary} />
            </WidgetShell>
          </div>
        </>
      ) : null}
    </div>
  );
}
