"use client";

import { Badge, Card, CardContent, cn } from "@kloqra/ui";

const statCards = [
  { label: "Active tenants", value: "128" },
  { label: "Trial orgs", value: "14" },
  { label: "Ops alerts", value: "2" }
] as const;

const auditRows = [
  { event: "Tenant provisioned", status: "Success", variant: "success-subtle" as const },
  { event: "Billing reconcile", status: "Healthy", variant: "info-subtle" as const },
  { event: "Queue backlog", status: "Watch", variant: "warning-subtle" as const }
] as const;

type PlatformConsolePreviewProps = {
  className?: string;
};

export function PlatformConsolePreview({ className }: PlatformConsolePreviewProps) {
  return (
    <Card
      aria-hidden
      className={cn(
        "w-full rounded-xl border-primary-foreground/20 bg-card py-0 text-card-foreground shadow-2xl shadow-black/25 sm:rounded-2xl",
        className
      )}
    >
      <CardContent className="space-y-3 p-4 sm:space-y-4 sm:p-5 xl:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-background px-2 py-2 sm:rounded-xl sm:px-3 sm:py-3"
            >
              <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{stat.label}</p>
              <p className="text-sm font-medium text-foreground sm:text-base">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-background p-3 sm:rounded-xl sm:p-4">
          <p className="mb-2 text-xs font-medium text-foreground sm:mb-3 sm:text-sm">
            Platform health
          </p>
          <div className="flex h-20 items-end gap-1 sm:h-24 sm:gap-1.5 xl:h-28">
            {[55, 72, 68, 85, 78, 90, 82].map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-sm bg-chart-1/90"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="hidden rounded-lg border border-border bg-background p-3 sm:block sm:rounded-xl sm:p-4">
          <p className="mb-2 text-xs font-medium text-foreground sm:mb-3 sm:text-sm">
            Recent audit activity
          </p>
          <div className="space-y-2 sm:space-y-3">
            {auditRows.map((row) => (
              <div
                key={row.event}
                className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0 sm:gap-3 sm:pb-3"
              >
                <span className="truncate text-xs text-foreground sm:text-sm">{row.event}</span>
                <Badge variant={row.variant} className="shrink-0 text-[10px] sm:text-xs">
                  {row.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
