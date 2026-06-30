"use client";

import { Card, CardContent, DashboardStatCard } from "@kloqra/ui";
import { Clock, DollarSign, FileText, Hourglass } from "lucide-react";
import type { TimeTrackerStats } from "./time-tracker-stats";

type TimeTrackerStatCardsProps = {
  stats: TimeTrackerStats;
  loading?: boolean;
};

export function TimeTrackerStatCards({ stats, loading = false }: TimeTrackerStatCardsProps) {
  const loadingHint = loading ? "Updating totals…" : undefined;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="p-4">
          <DashboardStatCard
            label={stats.periodLabel}
            value={stats.totalHours}
            icon={Clock}
            tone="primary"
          />
        </CardContent>
      </Card>
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="p-4">
          <DashboardStatCard
            label="Billable"
            value={stats.billableHours}
            hint={stats.billablePercent}
            icon={DollarSign}
            tone="success"
          />
        </CardContent>
      </Card>
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="p-4">
          <DashboardStatCard
            label="Pending Approval"
            value={stats.pendingHours}
            hint={
              stats.pendingCount > 0
                ? `${stats.pendingCount} entr${stats.pendingCount === 1 ? "y" : "ies"}`
                : "None pending"
            }
            icon={Hourglass}
            tone="warning"
          />
        </CardContent>
      </Card>
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="p-4">
          <DashboardStatCard
            label="Entries"
            value={String(stats.entryCount)}
            hint={loadingHint}
            icon={FileText}
            tone="premium"
          />
        </CardContent>
      </Card>
    </div>
  );
}
