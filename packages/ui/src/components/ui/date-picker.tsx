"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import {
  addMonths,
  buildMonthGrid,
  dateKeyFromDate,
  formatDateKeyLabel
} from "../../lib/date-keys.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

const WEEKDAY_LABELS_MONDAY: string[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_LABELS_SUNDAY: string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  weekStartsOn?: 0 | 1;
  maxDate?: string;
  popoverAlign?: "start" | "center" | "end";
};

type MonthPanelProps = {
  year: number;
  month: number;
  weekStartsOn: 0 | 1;
  value: string;
  onDayClick: (key: string) => void;
  maxDate?: string;
};

function monthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function MonthPanel({ year, month, weekStartsOn, value, onDayClick, maxDate }: MonthPanelProps) {
  const weeks = buildMonthGrid(year, month, weekStartsOn);
  const weekdayLabels = weekStartsOn === 1 ? WEEKDAY_LABELS_MONDAY : WEEKDAY_LABELS_SUNDAY;
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

          const isSelected = key === value;
          const isToday = key === todayKey;
          const isDisabled = maxDate ? key > maxDate : false;

          return (
            <button
              key={key}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onDayClick(key)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                isToday &&
                  !isSelected &&
                  "border border-primary text-primary font-semibold hover:bg-accent hover:text-accent-foreground",
                isDisabled && "opacity-30 cursor-not-allowed pointer-events-none"
              )}
              aria-label={key}
              aria-pressed={isSelected}
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

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Select date",
  ariaLabel = "Select date",
  disabled = false,
  weekStartsOn = 1,
  maxDate,
  popoverAlign = "start"
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const anchor = value || dateKeyFromDate(new Date());
    const [year, month] = anchor.split("-").map(Number);
    return { year, month };
  });

  React.useEffect(() => {
    if (!open) return;
    const anchor = value || dateKeyFromDate(new Date());
    const [year, month] = anchor.split("-").map(Number);
    setVisibleMonth({ year, month });
  }, [open, value]);

  const triggerLabel = value ? formatDateKeyLabel(value) : placeholder;

  function handleDayClick(key: string) {
    onChange(key);
    setOpen(false);
  }

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
          <span className="truncate text-sm font-medium">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={popoverAlign}
        collisionPadding={24}
        className="w-auto max-w-[min(100vw-2rem,22rem)] p-0"
      >
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

        <div className="grid gap-6 p-4 grid-cols-1">
          <MonthPanel
            year={visibleMonth.year}
            month={visibleMonth.month}
            weekStartsOn={weekStartsOn}
            value={value}
            onDayClick={handleDayClick}
            maxDate={maxDate}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
