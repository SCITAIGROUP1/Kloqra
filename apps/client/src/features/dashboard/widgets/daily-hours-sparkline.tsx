"use client";

import type { TeamActivityDayDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import { useMemo } from "react";
import {
  dayChartLabel,
  dayTooltipLabel,
  formatWeekHours,
  isTodayDateKey,
  maxDailyHours,
  shouldShowDayLabel,
  sparklineBarHeightPx,
  sparklineMinWidthPx
} from "./team-activities-data";

type DailyHoursSparklineProps = {
  days: TeamActivityDayDto[];
  periodTotalHours: number;
  className?: string;
  showCaption?: boolean;
  timezone?: string;
};

export function DailyHoursSparkline({
  days,
  periodTotalHours,
  className,
  showCaption = false,
  timezone
}: DailyHoursSparklineProps) {
  const dayCount = days.length;
  const maxHours = useMemo(() => maxDailyHours(days), [days]);
  const hasHours = periodTotalHours > 0;
  const minWidth = sparklineMinWidthPx(dayCount);
  const scrollable = dayCount > 7;

  return (
    <div className={cn("min-w-0", className)}>
      {showCaption ? (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Hours by day
        </p>
      ) : null}

      <div
        className={cn(
          "rounded-md bg-muted/20 ring-1 ring-border/35",
          scrollable ? "overflow-x-auto" : "overflow-hidden"
        )}
      >
        <div
          className={cn("px-1 py-1.5", scrollable ? "min-w-full" : "w-full")}
          style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
        >
          <div
            className="flex h-10 items-end gap-0.5"
            role="img"
            aria-label={
              hasHours
                ? `Daily hours: ${formatWeekHours(periodTotalHours)} in selected period`
                : "No hours logged in selected period"
            }
          >
            {days.map((day) => {
              const barHeight = sparklineBarHeightPx(day.hours, maxHours);
              const isToday = isTodayDateKey(day.dateKey, timezone);
              const tooltip = `${dayTooltipLabel(day.dateKey)}: ${formatWeekHours(day.hours)}`;

              return (
                <div
                  key={day.dateKey}
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                  title={tooltip}
                >
                  <div className="flex h-9 w-full items-end justify-center px-px">
                    <div
                      className={cn(
                        "w-full max-w-[12px] rounded-[3px] transition-colors",
                        day.hours > 0
                          ? isToday
                            ? "bg-primary shadow-sm ring-1 ring-primary/40"
                            : "bg-primary/75 group-hover:bg-primary"
                          : "bg-transparent"
                      )}
                      style={{ height: barHeight > 0 ? `${barHeight}px` : "2px" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-1 flex gap-0.5">
            {days.map((day, index) => (
              <div key={`${day.dateKey}-label`} className="min-w-0 flex-1 text-center">
                {shouldShowDayLabel(index, dayCount) ? (
                  <span
                    className={cn(
                      "block truncate text-[8px] leading-none",
                      isTodayDateKey(day.dateKey, timezone)
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {dayChartLabel(day.dateKey, dayCount)}
                  </span>
                ) : (
                  <span className="block h-2" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
