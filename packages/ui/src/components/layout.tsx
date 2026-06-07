"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils.js";

export function PageHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-1.5 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  className
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  size = "sm",
  fullWidth = false
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/40",
        size === "md" ? "p-1.5" : "p-1",
        fullWidth ? "grid w-full gap-2" : "inline-flex w-full flex-wrap gap-1.5 sm:w-auto"
      )}
      style={
        fullWidth ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined
      }
      role="group"
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md font-medium transition-colors",
            fullWidth && "min-w-0 flex-1",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
            value === opt.value
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
  cardless = false
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "billable" | "revenue" | "muted";
  cardless?: boolean;
}) {
  const accentBar = {
    default: "bg-primary",
    billable: "bg-emerald-500",
    revenue: "bg-blue-500",
    muted: "bg-muted-foreground/40"
  }[accent];

  if (cardless) {
    return (
      <div className="flex flex-col justify-center h-full">
        <p className="text-2xl font-bold tabular-nums tracking-tight leading-none">{value}</p>
        {hint ? <p className="mt-2 text-xs text-muted-foreground leading-none">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={cn("absolute left-0 top-0 h-1 w-full", accentBar)} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PreviewBanner({
  loading,
  empty,
  error,
  children
}: {
  loading?: boolean;
  empty?: boolean;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        loading && "border-border bg-muted/30 text-muted-foreground animate-pulse",
        error && "border-destructive/40 bg-destructive/5 text-destructive",
        empty && !error && "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
        !loading && !empty && !error && "border-border bg-muted/20 text-foreground"
      )}
    >
      {children}
    </div>
  );
}

export function ToggleChip({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground font-medium"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent/50"
      )}
    >
      {children}
    </button>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-xl bg-muted/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/60" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-muted/60" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-72 rounded-xl bg-muted/60 lg:col-span-3" />
        <div className="h-72 rounded-xl bg-muted/60 lg:col-span-2" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
