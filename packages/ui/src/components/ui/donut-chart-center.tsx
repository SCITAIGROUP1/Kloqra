"use client";

import * as React from "react";
import { cn } from "../../lib/utils.js";

export type DonutLegendItem = {
  key: string;
  label: React.ReactNode;
  color: string;
};

export function DonutLegend({
  items,
  className
}: {
  items: DonutLegendItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="flex max-w-full items-center gap-1.5 text-xs">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="truncate text-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export type DonutChartCenterProps = {
  chart: React.ReactNode;
  center: React.ReactNode;
  legend?: React.ReactNode;
  className?: string;
  chartClassName?: string;
};

/** Keeps donut ring totals centered by isolating the chart from legends below. */
export function DonutChartCenter({
  chart,
  center,
  legend,
  className,
  chartClassName
}: DonutChartCenterProps) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col items-center", className)}>
      <div className={cn("relative aspect-square w-full max-w-[280px]", chartClassName)}>
        <div className="absolute inset-0">{chart}</div>
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-2 text-center">
          {center}
        </div>
      </div>
      {legend}
    </div>
  );
}
