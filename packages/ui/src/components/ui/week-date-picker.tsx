"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import {
  addMonths,
  buildMonthGrid,
  dateKeyFromDate,
  isDateKeyInRange,
  isSameMonthKey,
  weekBoundsForDateKey
} from "../../lib/date-keys.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

const WEEKDAY_LABELS_MONDAY: string[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_LABELS_SUNDAY: string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type WeekDatePickerHighlightMode = "week" | "day" | "month";

export type WeekDatePickerProps = {
  anchorDate: string;
  onChange: (dateKey: string) => void;
  label: string;
  weekStartsOn?: 0 | 1;
  highlightMode?: WeekDatePickerHighlightMode;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  maxDate?: string;
};

function monthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function highlightBounds(
  anchorDate: string,
  hoverKey: string | null,
  highlightMode: WeekDatePickerHighlightMode,
  weekStartsOn: 0 | 1
): {
  committed: { from: string; to: string } | null;
  preview: { from: string; to: string } | null;
} {
  const committed =
    highlightMode === "week"
      ? weekBoundsForDateKey(anchorDate, weekStartsOn)
      : highlightMode === "day"
        ? { from: anchorDate, to: anchorDate }
        : null;

  const preview =
    hoverKey && highlightMode === "week"
      ? weekBoundsForDateKey(hoverKey, weekStartsOn)
      : hoverKey && highlightMode === "day"
        ? { from: hoverKey, to: hoverKey }
        : null;

  return { committed, preview };
}

function MonthPanel({
  year,
  month,
  weekStartsOn,
  anchorDate,
  hoverKey,
  highlightMode,
  onDayClick,
  onDayHover,
  maxDate
}: {
  year: number;
  month: number;
  weekStartsOn: 0 | 1;
  anchorDate: string;
  hoverKey: string | null;
  highlightMode: WeekDatePickerHighlightMode;
  onDayClick: (key: string) => void;
  onDayHover: (key: string | null) => void;
  maxDate?: string;
}) {
  const weeks = buildMonthGrid(year, month, weekStartsOn);
  const weekdayLabels = weekStartsOn === 1 ? WEEKDAY_LABELS_MONDAY : WEEKDAY_LABELS_SUNDAY;
  const { committed, preview } = highlightBounds(anchorDate, hoverKey, highlightMode, weekStartsOn);
  const todayKey = dateKeyFromDate(new Date());

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-semibold text-foreground">{monthTitle(year, month)}</p>
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {weeks.flat().map((key, index) => {
          if (!key) {
            return <div key={`empty-${index}`} className="h-9 w-9" aria-hidden />;
          }

          const inCommittedRange = committed
            ? isDateKeyInRange(key, committed.from, committed.to)
            : false;
          const inPreviewRange =
            preview &&
            (!committed || preview.from !== committed.from || preview.to !== committed.to)
              ? isDateKeyInRange(key, preview.from, preview.to)
              : false;
          const isAnchor = key === anchorDate;
          const isStart = committed ? key === committed.from : false;
          const isEnd = committed ? key === committed.to : false;
          const isToday = key === todayKey;
          const inAnchorMonth = highlightMode === "month" && isSameMonthKey(key, anchorDate);

          const isSelectedEndpoint = isStart || isEnd || (highlightMode === "day" && isAnchor);
          const isDisabled = maxDate ? key > maxDate : false;

          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onDayClick(key)}
              onMouseEnter={() => !isDisabled && onDayHover(key)}
              onMouseLeave={() => !isDisabled && onDayHover(null)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                inAnchorMonth && !isToday && "bg-muted/50",
                (inCommittedRange || inPreviewRange) && !isToday && "bg-primary/12 text-primary",
                isSelectedEndpoint &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                isToday &&
                  !isSelectedEndpoint &&
                  "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
                isDisabled && "opacity-30 cursor-not-allowed pointer-events-none"
              )}
              aria-label={key}
              aria-pressed={inCommittedRange || isAnchor}
              aria-current={isToday ? "date" : undefined}
            >
              {Number(key.split("-")[2])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WeekDatePicker({
  anchorDate,
  onChange,
  label,
  weekStartsOn = 1,
  highlightMode = "week",
  className,
  ariaLabel = "Jump to date",
  disabled = false,
  maxDate
}: WeekDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hoverKey, setHoverKey] = React.useState<string | null>(null);
  const [showSecondMonth, setShowSecondMonth] = React.useState(true);
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const [year, month] = anchorDate.split("-").map(Number);
    return { year, month };
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setShowSecondMonth(true);
      return;
    }

    const media = window.matchMedia("(min-width: 640px)");
    const syncMonths = () => setShowSecondMonth(media.matches);
    syncMonths();
    media.addEventListener("change", syncMonths);
    return () => media.removeEventListener("change", syncMonths);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const [year, month] = anchorDate.split("-").map(Number);
    setVisibleMonth({ year, month });
    setHoverKey(null);
  }, [open, anchorDate]);

  function handleDayClick(key: string) {
    onChange(key);
    setOpen(false);
  }

  const secondMonth = addMonths(visibleMonth.year, visibleMonth.month, 1);
  const pickerTitle =
    highlightMode === "week"
      ? "Jump to week"
      : highlightMode === "month"
        ? "Jump to month"
        : "Jump to day";
  const pickerHint =
    highlightMode === "week"
      ? "Select any day to open that week."
      : highlightMode === "month"
        ? "Select any day to open that month."
        : "Select a day to open it in the calendar.";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn("h-8 gap-2 px-3 font-normal", className)}
        >
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-medium">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={24}
        className="w-auto max-w-[min(100vw-2rem,42rem)] p-0"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{pickerTitle}</p>
          <p className="text-xs text-muted-foreground">{pickerHint}</p>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Previous month"
            onClick={() => setVisibleMonth((current) => addMonths(current.year, current.month, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Next month"
            onClick={() => setVisibleMonth((current) => addMonths(current.year, current.month, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className={cn("grid gap-6 p-4", showSecondMonth ? "sm:grid-cols-2" : "grid-cols-1")}>
          <MonthPanel
            year={visibleMonth.year}
            month={visibleMonth.month}
            weekStartsOn={weekStartsOn}
            anchorDate={anchorDate}
            hoverKey={hoverKey}
            highlightMode={highlightMode}
            onDayClick={handleDayClick}
            onDayHover={setHoverKey}
            maxDate={maxDate}
          />
          {showSecondMonth ? (
            <MonthPanel
              year={secondMonth.year}
              month={secondMonth.month}
              weekStartsOn={weekStartsOn}
              anchorDate={anchorDate}
              hoverKey={hoverKey}
              highlightMode={highlightMode}
              onDayClick={handleDayClick}
              onDayHover={setHoverKey}
              maxDate={maxDate}
            />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
