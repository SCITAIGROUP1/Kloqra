"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { CALENDAR_TODAY_CLASS } from "../../lib/calendar-styles.js";
import {
  addMonths,
  buildMonthGrid,
  compareDateKeys,
  dateKeyFromDate,
  formatDateRangeLabel,
  isDateKeyInRange,
  normalizeDateRange
} from "../../lib/date-keys.js";
import { cn } from "../../lib/utils.js";
import { Button } from "./button.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

const WEEKDAY_LABELS_MONDAY: string[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_LABELS_SUNDAY: string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type DateRangePickerProps = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  weekStartsOn?: 0 | 1;
  numberOfMonths?: 1 | 2;
  /** Align popover to trigger edge — `end` keeps wide calendars inside the viewport. */
  popoverAlign?: "start" | "center" | "end";
  /** When true (default), show one month in the popover below the `sm` breakpoint. */
  collapseToSingleMonthOnMobile?: boolean;
};

type DraftRange = {
  from: string;
  to: string;
};

function monthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function MonthPanel({
  year,
  month,
  weekStartsOn,
  draft,
  hoverKey,
  onDayClick,
  onDayHover
}: {
  year: number;
  month: number;
  weekStartsOn: 0 | 1;
  draft: DraftRange;
  hoverKey: string | null;
  onDayClick: (key: string) => void;
  onDayHover: (key: string | null) => void;
}) {
  const weeks = buildMonthGrid(year, month, weekStartsOn);
  const weekdayLabels = weekStartsOn === 1 ? WEEKDAY_LABELS_MONDAY : WEEKDAY_LABELS_SUNDAY;
  const previewEnd =
    draft.from && !draft.to && hoverKey && compareDateKeys(hoverKey, draft.from) >= 0
      ? hoverKey
      : draft.to;

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

          const inCommittedRange =
            draft.from && draft.to ? isDateKeyInRange(key, draft.from, draft.to) : false;
          const inPreviewRange =
            draft.from && previewEnd ? isDateKeyInRange(key, draft.from, previewEnd) : false;
          const isStart = key === draft.from;
          const isEnd = key === draft.to || (draft.from && !draft.to && key === previewEnd);
          const isToday = key === dateKeyFromDate(new Date());
          const isSelectedEndpoint = isStart || isEnd;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(key)}
              onMouseEnter={() => onDayHover(key)}
              onMouseLeave={() => onDayHover(null)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                (inCommittedRange || inPreviewRange) &&
                  !isSelectedEndpoint &&
                  "bg-primary/12 text-primary",
                isSelectedEndpoint &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                isToday && !isSelectedEndpoint && CALENDAR_TODAY_CLASS
              )}
              aria-label={key}
              aria-pressed={isStart || isEnd || inCommittedRange}
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

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
  placeholder = "Select dates",
  ariaLabel = "Date range",
  disabled = false,
  weekStartsOn = 1,
  numberOfMonths = 2,
  popoverAlign = "end",
  collapseToSingleMonthOnMobile = true
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DraftRange>({ from, to });
  const [hoverKey, setHoverKey] = React.useState<string | null>(null);
  const [visibleMonths, setVisibleMonths] = React.useState(numberOfMonths);
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const anchor = from || dateKeyFromDate(new Date());
    const [year, month] = anchor.split("-").map(Number);
    return { year, month };
  });

  React.useEffect(() => {
    if (!collapseToSingleMonthOnMobile) {
      setVisibleMonths(numberOfMonths);
      return;
    }
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setVisibleMonths(numberOfMonths);
      return;
    }

    const media = window.matchMedia("(min-width: 640px)");
    const syncMonths = () => setVisibleMonths(media.matches ? numberOfMonths : 1);
    syncMonths();
    media.addEventListener("change", syncMonths);
    return () => media.removeEventListener("change", syncMonths);
  }, [numberOfMonths, collapseToSingleMonthOnMobile]);

  React.useEffect(() => {
    if (!open) return;
    const normalized = normalizeDateRange(from, to);
    setDraft(normalized);
    const anchor = normalized.from || dateKeyFromDate(new Date());
    const [year, month] = anchor.split("-").map(Number);
    setVisibleMonth({ year, month });
    setHoverKey(null);
  }, [open, from, to]);

  const triggerLabel = from && to ? formatDateRangeLabel(from, to) : placeholder;

  function handleDayClick(key: string) {
    setDraft((current) => {
      if (!current.from || (current.from && current.to)) {
        return { from: key, to: "" };
      }
      return normalizeDateRange(current.from, key);
    });
  }

  function handleApply() {
    if (!draft.from || !draft.to) return;
    const normalized = normalizeDateRange(draft.from, draft.to);
    onChange(normalized.from, normalized.to);
    setOpen(false);
  }

  function handleClear() {
    setDraft({ from: "", to: "" });
    setHoverKey(null);
  }

  const secondMonth = addMonths(visibleMonth.year, visibleMonth.month, 1);
  const showSecondMonth = visibleMonths === 2;
  const canApply = Boolean(draft.from && draft.to);
  const footerLabel =
    draft.from && draft.to
      ? formatDateRangeLabel(draft.from, draft.to)
      : draft.from
        ? "Select an end date"
        : "Select a start date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-9 w-full min-w-0 justify-start gap-2 px-3 font-normal shadow-sm",
            !from && !to && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={popoverAlign}
        collisionPadding={24}
        className="w-auto max-w-[min(100vw-2rem,42rem)] p-0"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Date range</p>
          <p className="text-xs text-muted-foreground">
            Choose a start and end date for your entries.
          </p>
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

        <div
          className={cn(
            "grid gap-6 p-4",
            showSecondMonth ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
          )}
        >
          <MonthPanel
            year={visibleMonth.year}
            month={visibleMonth.month}
            weekStartsOn={weekStartsOn}
            draft={draft}
            hoverKey={hoverKey}
            onDayClick={handleDayClick}
            onDayHover={setHoverKey}
          />
          {showSecondMonth ? (
            <MonthPanel
              year={secondMonth.year}
              month={secondMonth.month}
              weekStartsOn={weekStartsOn}
              draft={draft}
              hoverKey={hoverKey}
              onDayClick={handleDayClick}
              onDayHover={setHoverKey}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <p className="truncate text-xs text-muted-foreground">{footerLabel}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" size="sm" disabled={!canApply} onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
