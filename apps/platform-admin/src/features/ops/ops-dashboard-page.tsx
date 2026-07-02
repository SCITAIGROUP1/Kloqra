"use client";

import {
  AppBar,
  Card,
  CardContent,
  CenteredLoader,
  DashboardStatCard,
  type DashboardStatTone
} from "@kloqra/ui";
import { usePlatformOpsSummary } from "@kloqra/web-shared";
import { Activity, AlertTriangle, Building2, CreditCard, Users, Workflow } from "lucide-react";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

const OPS_STAT_TONES: DashboardStatTone[] = [
  "primary",
  "success",
  "warning",
  "premium",
  "primary",
  "warning"
];

export function OpsDashboardPage() {
  const { summary, loading, error } = usePlatformOpsSummary();

  return (
    <div className="space-y-6">
      <AppBar
        title="Ops"
        description="Fleet health — tenants, subscriptions, usage, and background queues."
      />

      {loading ? <CenteredLoader label="Loading ops summary…" /> : null}
      {!loading && (error || !summary) ? (
        <div className="text-sm text-destructive">{error ?? "Ops summary unavailable"}</div>
      ) : null}
      {!loading && summary ? <OpsDashboardContent summary={summary} /> : null}
    </div>
  );
}

function OpsDashboardContent({
  summary
}: {
  summary: NonNullable<ReturnType<typeof usePlatformOpsSummary>["summary"]>;
}) {
  const failedJobs = Object.values(summary.queues).reduce((sum, queue) => sum + queue.failed, 0);

  const stats = [
    {
      label: "Active tenants",
      value: String(summary.tenants.active),
      hint: `${summary.tenants.pendingSetup} pending setup`,
      icon: Building2
    },
    {
      label: "Trial subscriptions",
      value: String(summary.subscriptions.trial),
      hint: `${summary.tenants.suspended} suspended orgs`,
      icon: Activity
    },
    {
      label: "Past due",
      value: String(summary.subscriptions.pastDue),
      hint: `${summary.subscriptions.canceled} canceled`,
      icon: AlertTriangle
    },
    {
      label: "MRR (Stripe)",
      value: summary.mrr ? formatUsd(summary.mrr.amountCents) : "—",
      hint: summary.mrr ? "Active + trialing" : "Stripe not configured",
      icon: CreditCard
    },
    {
      label: "Total seats",
      value: String(summary.usage.totalSeats),
      hint: `${summary.usage.totalWorkspaces} workspaces`,
      icon: Users
    },
    {
      label: "Failed queue jobs",
      value: String(failedJobs),
      hint: `${summary.reconcile.driftCount} subscription drift`,
      icon: Workflow
    }
  ] as const;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={stat.label} className="border-primary/10 shadow-sm">
            <CardContent className="p-4">
              <DashboardStatCard
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
                icon={stat.icon}
                tone={OPS_STAT_TONES[index]}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Queue depth</h2>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(summary.queues).map(([name, counts]) => (
            <div
              key={name}
              className="grid grid-cols-5 gap-2 px-4 py-3 text-sm"
              data-testid={`ops-queue-${name}`}
            >
              <span className="col-span-2 font-medium">{name}</span>
              <span className="text-muted-foreground">wait {counts.waiting}</span>
              <span className="text-muted-foreground">active {counts.active}</span>
              <span className={counts.failed > 0 ? "text-destructive" : "text-muted-foreground"}>
                failed {counts.failed}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
