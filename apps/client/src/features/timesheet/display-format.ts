import {
  formatUserDate,
  formatUserTime,
  type DateFormatPreference,
  type TimeFormatPreference
} from "@kloqra/contracts";

export type TimesheetDisplayFormat = {
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
};

export function formatDayHeader(date: Date, format: TimesheetDisplayFormat): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    weekday: "short"
  }).format(date);
  return `${weekday} ${formatUserDate(date, format.dateFormat, format.timezone)}`;
}

export function formatWeekRangeLabel(weekStart: Date, format: TimesheetDisplayFormat): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const start = formatUserDate(weekStart, format.dateFormat, format.timezone);
  const end = formatUserDate(weekEnd, format.dateFormat, format.timezone);
  const endYear = new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    year: "numeric"
  }).format(weekEnd);
  return `${start} – ${end}, ${endYear}`;
}

export function formatMonthYearLabel(date: Date, format: TimesheetDisplayFormat): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatClockLabel(
  hour: number,
  minute: number,
  format: TimesheetDisplayFormat
): string {
  const sample = new Date(Date.UTC(2000, 0, 1, hour, minute));
  return formatUserTime(sample, format.timeFormat, format.timezone);
}

export function formatEntryDateLabel(date: Date, format: TimesheetDisplayFormat): string {
  return formatUserDate(date, format.dateFormat, format.timezone);
}

/** Compact row date for time tracker tables — e.g. "Jun 6". */
export function formatEntryShortDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric"
  }).format(date);
}

export function formatWeekOfLabel(weekStart: Date, format: TimesheetDisplayFormat): string {
  return `Week of ${formatUserDate(weekStart, format.dateFormat, format.timezone)}`;
}

/** Compact week header — e.g. "Week of Jun 6". */
export function formatWeekOfShortLabel(weekStart: Date, timezone: string): string {
  return `Week of ${formatEntryShortDate(weekStart, timezone)}`;
}

export function formatDayRangeLabel(date: Date, format: TimesheetDisplayFormat): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    weekday: "long"
  }).format(date);
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    month: "long"
  }).format(date);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    day: "numeric"
  }).format(date);
  const year = new Intl.DateTimeFormat("en-US", {
    timeZone: format.timezone,
    year: "numeric"
  }).format(date);
  return `${weekday}, ${month} ${day}, ${year}`;
}
