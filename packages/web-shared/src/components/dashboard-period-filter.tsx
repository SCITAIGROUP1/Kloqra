"use client";

import { DateRangePicker, SegmentedControl, cn } from "@kloqra/ui";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { DashboardPeriodPreset } from "../utils/dashboard-period-presets.js";

export type DashboardPeriodSelection = DashboardPeriodPreset | "custom";

export type DashboardPeriodFilterOption = {
  value: DashboardPeriodPreset;
  label: string;
};

export type DashboardPeriodFilterProps = {
  range: DashboardPeriodSelection;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (from: string, to: string) => void;
  presets: DashboardPeriodFilterOption[];
  weekStartsOn?: 0 | 1;
  dateRangeAriaLabel?: string;
  className?: string;
};

/** Two-month picker needs this filter container width (compact laptops stack earlier). */
const WIDE_FILTER_MIN_PX = 900;

function FilterFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function DashboardPeriodFilter({
  range,
  onPresetChange,
  startDate,
  endDate,
  onDateRangeChange,
  presets,
  weekStartsOn = 1,
  dateRangeAriaLabel = "Date range",
  className
}: DashboardPeriodFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [wideLayout, setWideLayout] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const sync = (width: number) => setWideLayout(width >= WIDE_FILTER_MIN_PX);
    sync(node.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      sync(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "@container rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4",
        className
      )}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          wideLayout && "grid-cols-[minmax(0,1fr)_auto_minmax(220px,320px)] items-end gap-5"
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Period</FilterFieldLabel>
          <SegmentedControl
            value={range}
            onChange={onPresetChange}
            options={presets}
            size="sm"
            fullWidth
          />
        </div>

        {wideLayout ? (
          <div className="hidden w-px self-stretch bg-border/60 sm:block" aria-hidden />
        ) : null}

        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Range</FilterFieldLabel>
          <DateRangePicker
            from={startDate}
            to={endDate}
            onChange={onDateRangeChange}
            weekStartsOn={weekStartsOn}
            ariaLabel={dateRangeAriaLabel}
            className="w-full min-w-0"
            numberOfMonths={wideLayout ? 2 : 1}
            popoverAlign="end"
          />
        </div>
      </div>
    </div>
  );
}
