"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils.js";
import { MotionReveal } from "./motion/motion-reveal.js";
import { AppBarToolbar } from "./shell/app-bar-toolbar.js";
import { AppBar, type AppBarProps } from "./shell/app-bar.js";
import {
  isShellToolbarParts,
  resolveShellToolbar,
  useShellToolbar
} from "./shell-toolbar-context.js";
import { Skeleton } from "./ui/skeleton.js";

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** `appBar` — sticky shared app bar (default). `inline` — simple section header. */
  variant?: "appBar" | "inline";
} & Pick<AppBarProps, "secondary">;

/** @deprecated Prefer `AppBar` for new pages. Kept for existing imports. */
export function PageHeader({
  title,
  description,
  actions,
  secondary,
  className,
  variant = "appBar"
}: PageHeaderProps) {
  const shellToolbar = useShellToolbar();
  const legacyShellActions =
    shellToolbar != null && isShellToolbarParts(shellToolbar)
      ? resolveShellToolbar(shellToolbar).actions
      : shellToolbar;
  const trailing = (
    <AppBarToolbar pageActions={actions} shellActions={legacyShellActions ?? undefined} />
  );

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between",
          className
        )}
      >
        <div className="min-w-0 space-y-1.5">
          {typeof title === "string" ? (
            <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
          ) : (
            <div className="text-2xl font-medium tracking-tight">{title}</div>
          )}
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions || shellToolbar ? <div className="flex shrink-0">{trailing}</div> : null}
      </div>
    );
  }

  return (
    <AppBar
      title={title}
      description={description}
      actions={actions}
      secondary={secondary}
      className={className}
    />
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
        <h2 className="text-sm font-medium">{title}</h2>
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
  /** May be a value not present in `options` — no segment will appear selected. */
  value: T | (string & {});
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState({ left: 0, width: 0, height: 0, top: 0 });
  const activeIndex = options.findIndex((opt) => opt.value === value);

  const updateHighlight = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (activeIndex < 0) {
      setHighlight({ left: 0, width: 0, height: 0, top: 0 });
      return;
    }
    const buttons = container.querySelectorAll("button");
    const activeBtn = buttons[activeIndex] as HTMLElement | undefined;
    if (!activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setHighlight({
      left: btnRect.left - containerRect.left + container.scrollLeft,
      top: btnRect.top - containerRect.top + container.scrollTop,
      width: btnRect.width,
      height: btnRect.height
    });
  }, [activeIndex]);

  useEffect(() => {
    if (fullWidth) return;
    const frame = requestAnimationFrame(() => updateHighlight());
    return () => cancelAnimationFrame(frame);
  }, [value, updateHighlight, options, size, fullWidth]);

  useEffect(() => {
    if (fullWidth) return;
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => updateHighlight());
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [updateHighlight, fullWidth]);

  const highlightSurfaceClass =
    "pointer-events-none rounded-md border border-border bg-background shadow-sm";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-muted/40",
        size === "md" ? "p-1.5" : "p-1",
        fullWidth ? "grid w-full min-w-0 gap-1" : "inline-flex w-full flex-wrap gap-2 sm:w-auto"
      )}
      style={
        fullWidth ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined
      }
      role="group"
    >
      {fullWidth && activeIndex >= 0 ? (
        <span
          aria-hidden
          className={cn(
            highlightSurfaceClass,
            "z-0 row-start-1 self-stretch justify-self-stretch transition-[grid-column] duration-[var(--motion-base)] ease-[var(--motion-ease-out)] motion-reduce:transition-none"
          )}
          style={{ gridColumn: activeIndex + 1, gridRow: 1 }}
        />
      ) : null}
      {!fullWidth && activeIndex >= 0 && highlight.width > 0 ? (
        <span
          aria-hidden
          className={cn(
            highlightSurfaceClass,
            "absolute z-0 transition-[left,width,top,height] duration-[var(--motion-base)] ease-[var(--motion-ease-out)] motion-reduce:transition-none"
          )}
          style={{
            left: highlight.left,
            top: highlight.top,
            width: highlight.width,
            height: highlight.height
          }}
        />
      ) : null}
      {options.map((opt, index) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          style={fullWidth ? { gridColumn: index + 1, gridRow: 1 } : undefined}
          className={cn(
            "relative z-10 rounded-md font-medium transition-colors duration-[var(--motion-fast)]",
            fullWidth && "min-w-0 w-full truncate px-2 text-center",
            !fullWidth && "shrink-0",
            size === "sm" ? "py-1.5 text-xs" : "px-4 py-2.5 text-sm",
            !fullWidth && size === "sm" && "px-3",
            value === opt.value
              ? "text-foreground"
              : "border border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
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
        empty &&
          !error &&
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
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
    <div className="space-y-6">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-xl lg:col-span-3" />
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
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
    <MotionReveal>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </MotionReveal>
  );
}
