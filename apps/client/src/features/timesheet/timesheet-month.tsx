"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import { cn } from "@kloqra/ui";
import {
  formatDuration,
  getMonthGrid,
  startOfMonth,
  totalSecondsOnDay,
  toDateKey,
  isSameDayInZone,
  todayInZone
} from "./calendar-utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TimesheetMonthProps = {
  month: Date;
  logs: TimeLogDto[];
  entryColor: (taskId: string) => string;
  onDayClick: (day: Date) => void;
  timezone?: string;
};

export function TimesheetMonth({
  month,
  logs,
  entryColor,
  onDayClick,
  timezone = "UTC"
}: TimesheetMonthProps) {
  const weeks = getMonthGrid(month);
  const today = todayInZone(timezone);
  const monthStart = startOfMonth(month);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
          {week.map((day, di) => {
            if (!day) {
              return (
                <div key={di} className="min-h-[5rem] border-l border-border/50 bg-muted/10" />
              );
            }
            const inMonth = day.getMonth() === monthStart.getMonth();
            const totalSec = totalSecondsOnDay(logs, day, timezone);
            const dayLogs = logs.filter((l) => {
              const clip = totalSecondsOnDay([l], day, timezone);
              return clip > 0;
            });

            return (
              <button
                key={toDateKey(day)}
                type="button"
                className={cn(
                  "min-h-[5rem] border-l border-border p-2 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  !inMonth && "text-muted-foreground opacity-50",
                  isSameDayInZone(day, today, timezone) && "bg-primary/10"
                )}
                onClick={() => onDayClick(day)}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm",
                    isSameDayInZone(day, today, timezone) &&
                      "bg-primary font-semibold text-primary-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
                {totalSec > 0 && (
                  <p className="mt-1 text-xs font-medium text-primary">
                    {formatDuration(totalSec)}
                  </p>
                )}
                {dayLogs.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayLogs.slice(0, 4).map((l) => (
                      <span
                        key={l.id}
                        className="h-2 w-2 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: entryColor(l.taskId) }}
                        title={l.description ?? undefined}
                      />
                    ))}
                    {dayLogs.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayLogs.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
