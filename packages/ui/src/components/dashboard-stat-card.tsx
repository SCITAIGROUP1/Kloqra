"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils.js";

export type DashboardStatTone = "primary" | "success" | "premium" | "warning";

const toneStyles: Record<DashboardStatTone, { icon: string; trendUp: string; trendDown: string }> =
  {
    primary: {
      icon: "bg-primary/10 text-primary",
      trendUp: "text-success",
      trendDown: "text-destructive"
    },
    success: {
      icon: "bg-success/15 text-success",
      trendUp: "text-success",
      trendDown: "text-destructive"
    },
    premium: {
      icon: "bg-premium/15 text-premium",
      trendUp: "text-success",
      trendDown: "text-destructive"
    },
    warning: {
      icon: "bg-warning/15 text-warning",
      trendUp: "text-success",
      trendDown: "text-destructive"
    }
  };

export type DashboardStatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: DashboardStatTone;
  trend?: { label: string; positive?: boolean };
  className?: string;
};

export function DashboardStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
  className
}: DashboardStatCardProps) {
  const styles = toneStyles[tone];

  return (
    <div className={cn("flex h-full flex-col justify-between gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-medium tabular-nums tracking-tight leading-none">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            styles.icon
          )}
        >
          <Icon className="size-5" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {trend ? (
          <p
            className={cn(
              "text-xs font-medium",
              trend.positive === false ? styles.trendDown : styles.trendUp
            )}
          >
            {trend.label}
          </p>
        ) : null}
      </div>
    </div>
  );
}
