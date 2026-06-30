"use client";

import { cn } from "@kloqra/ui";
import { useEffect, useRef } from "react";
import type { DayLogGroup } from "./group-logs-by-week";
import { formatHoursDecimal } from "./group-logs-by-week";

export type TimeTrackerDayTabsProps = {
  days: DayLogGroup[];
  activeDayKey: string;
  onDayChange: (dayKey: string) => void;
};

export function TimeTrackerDayTabs({ days, activeDayKey, onDayChange }: TimeTrackerDayTabsProps) {
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({
      inline: "center",
      block: "nearest",
      behavior: "smooth"
    });
  }, [activeDayKey]);

  return (
    <div className="overflow-x-auto border-b border-border/70 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max snap-x snap-mandatory px-1 sm:min-w-0 sm:w-full sm:snap-none sm:px-5">
        {days.map((day) => {
          const isActive = day.dayKey === activeDayKey;
          return (
            <button
              key={day.dayKey}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              onClick={() => onDayChange(day.dayKey)}
              className={cn(
                "flex min-w-[4.25rem] shrink-0 snap-center flex-col items-center px-2 py-2.5 text-center transition-colors sm:min-w-0 sm:flex-1 sm:shrink sm:px-2 sm:py-3",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${day.dayLabel} ${day.dateLabel}`}
            >
              <span
                className={cn(
                  "text-xs sm:text-sm",
                  isActive ? "font-semibold text-primary" : "font-medium"
                )}
              >
                {day.dayLabel}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[11px] sm:text-xs",
                  isActive ? "text-primary/80" : "text-muted-foreground"
                )}
              >
                {day.dateLabel}
              </span>
              <span
                className={cn(
                  "mt-1 text-xs tabular-nums sm:text-sm",
                  isActive ? "font-semibold text-primary" : ""
                )}
              >
                {formatHoursDecimal(day.totalSec)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
