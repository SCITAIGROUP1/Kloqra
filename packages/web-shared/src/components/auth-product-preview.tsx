"use client";

import { Badge, Card, CardContent, cn } from "@kloqra/ui";

const statCards = [
  { label: "Hours tracked", value: "142.5" },
  { label: "Active projects", value: "8" },
  { label: "Billable rate", value: "87%" }
] as const;

const barHeights = [40, 65, 45, 80, 55, 70, 50] as const;

const tableRows = [
  { project: "Website redesign", status: "In progress", variant: "info-subtle" as const },
  { project: "Mobile app", status: "Pending", variant: "warning-subtle" as const },
  { project: "Brand refresh", status: "Complete", variant: "success-subtle" as const }
] as const;

type AuthProductPreviewProps = {
  className?: string;
};

export function AuthProductPreview({ className }: AuthProductPreviewProps) {
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
            Weekly activity
          </p>
          <div className="flex h-20 items-end gap-1 sm:h-24 sm:gap-1.5 xl:h-28">
            {barHeights.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-sm bg-chart-1"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="hidden rounded-lg border border-border bg-background p-3 sm:block sm:rounded-xl sm:p-4">
          <p className="mb-2 text-xs font-medium text-foreground sm:mb-3 sm:text-sm">
            Recent entries
          </p>
          <div className="space-y-2 sm:space-y-3">
            {tableRows.map((row) => (
              <div
                key={row.project}
                className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0 sm:gap-3 sm:pb-3"
              >
                <span className="truncate text-xs text-foreground sm:text-sm">{row.project}</span>
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
