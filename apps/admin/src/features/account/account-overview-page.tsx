"use client";

import {
  AppBar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CenteredLoader,
  DateRangePicker,
  SegmentedControl,
  Skeleton
} from "@kloqra/ui";
import {
  localMidnightUtcInZone,
  todayInZone,
  CopyableValue,
  useTenantAnalyticsSummary,
  useTenantOverview
} from "@kloqra/web-shared";
import { Building2, Clock, CreditCard, DollarSign, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AccountWorkspaceHoursTable } from "./account-workspace-hours-table";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { formatDurationClock } from "@/components/report-charts";

type AccountRollupPreset = "7d" | "30d" | "90d" | "custom";

const ROLLUP_PRESETS: { value: AccountRollupPreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" }
];

function formatDateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function applyAccountRollupPreset(preset: AccountRollupPreset, timezone: string) {
  if (preset === "custom") {
    return applyAccountRollupPreset("30d", timezone);
  }
  const to = todayInZone(timezone);
  const from = new Date(to);
  const daysBack = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  from.setDate(from.getDate() - daysBack);
  return { from: formatDateKey(from), to: formatDateKey(to) };
}

function dateKeysToIsoRange(start: string, end: string, timezone: string) {
  const [fy, fm, fd] = start.split("-").map(Number);
  const [ty, tm, td] = end.split("-").map(Number);
  const from = localMidnightUtcInZone(fy, fm, fd, timezone).toISOString();
  const to = new Date(
    localMidnightUtcInZone(ty, tm, td, timezone).getTime() + 24 * 60 * 60 * 1000 - 1
  ).toISOString();
  return { from, to };
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

export function AccountOverviewPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const initialRange = useMemo(() => applyAccountRollupPreset("30d", timezone), [timezone]);

  const [preset, setPreset] = useState<AccountRollupPreset>("30d");
  const [startDate, setStartDate] = useState(initialRange.from);
  const [endDate, setEndDate] = useState(initialRange.to);

  const { overview, loading: overviewLoading, error: overviewError } = useTenantOverview();

  const { from, to } = useMemo(
    () => dateKeysToIsoRange(startDate, endDate, timezone),
    [startDate, endDate, timezone]
  );

  const {
    summary,
    loading: rollupLoading,
    error: rollupError
  } = useTenantAnalyticsSummary(from, to);

  useEffect(() => {
    if (preset !== "custom") {
      const next = applyAccountRollupPreset(preset, timezone);
      setStartDate(next.from);
      setEndDate(next.to);
    }
  }, [preset, timezone]);

  function handlePresetChange(next: AccountRollupPreset) {
    setPreset(next);
    if (next !== "custom") {
      const range = applyAccountRollupPreset(next, timezone);
      setStartDate(range.from);
      setEndDate(range.to);
    }
  }

  function handleDateRangeChange(fromKey: string, toKey: string) {
    setStartDate(fromKey);
    setEndDate(toKey);
    setPreset("custom");
  }

  if (overviewLoading) return <CenteredLoader label="Loading account overview…" />;
  if (overviewError || !overview) {
    return (
      <div className="p-6 text-sm text-destructive">
        {overviewError ?? "Account overview unavailable"}
      </div>
    );
  }

  const totals = summary?.totals;
  const billableHint =
    totals != null
      ? `${totals.billablePercent.toFixed(0)}% billable${totals.mixedCurrency ? " · mixed currencies" : ""}`
      : undefined;

  return (
    <div className="space-y-6">
      <AppBar title="Account overview" description="Organization summary and plan status." />

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          label="Plan"
          value={overview.subscription.planName}
          hint={overview.subscription.status}
          icon={CreditCard}
        />
        <DashboardStatCard
          label="Workspaces"
          value={String(overview.workspaceCount)}
          hint="In your organization"
          icon={Building2}
        />
        <DashboardStatCard
          label="Seats"
          value={String(overview.seatCount)}
          hint="Active users"
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{overview.tenant.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <CopyableValue
            label="Organization ID"
            value={overview.tenant.slug}
            testId="copy-org-slug-overview"
          />
          <p className="text-xs">Used in exports, billing records, and when contacting support.</p>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-label="Organization utilization">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-end lg:gap-5">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Period
              </span>
              <SegmentedControl
                value={preset}
                onChange={handlePresetChange}
                options={ROLLUP_PRESETS}
                size="sm"
                fullWidth
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Range
              </span>
              <DateRangePicker
                from={startDate}
                to={endDate}
                onChange={handleDateRangeChange}
                weekStartsOn={1}
                ariaLabel="Utilization date range"
                className="w-full min-w-0"
                numberOfMonths={1}
                popoverAlign="end"
              />
            </div>
          </div>
        </div>

        {rollupError ? (
          <div className="text-sm text-destructive">{rollupError}</div>
        ) : rollupLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : totals ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardStatCard
              label="Total hours"
              value={formatDurationClock(totals.totalHours)}
              hint="Across all workspaces"
              icon={Clock}
            />
            <DashboardStatCard
              label="Billable amount"
              value={formatMoney(totals.billableAmount, totals.currency)}
              hint={billableHint}
              icon={DollarSign}
            />
            <DashboardStatCard
              label="Active members"
              value={String(totals.activeMembers)}
              hint="With time logged in period"
              icon={Users}
            />
            <DashboardStatCard
              label="Active workspaces"
              value={String(totals.activeWorkspaces)}
              hint="With time logged in period"
              icon={Building2}
            />
          </div>
        ) : null}

        <AccountWorkspaceHoursTable
          rows={summary?.byWorkspace ?? []}
          loading={rollupLoading}
          fallbackCurrency={totals?.currency ?? "USD"}
          formatMoney={formatMoney}
        />
      </section>
    </div>
  );
}
