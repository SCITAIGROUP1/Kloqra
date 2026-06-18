import {
  formatUserDate,
  type DateFormatPreference,
  type TimeFormatPreference
} from "@kloqra/contracts";

export type TimesheetDisplayFormat = {
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
};

/** Compact row date for time tracker tables — e.g. "Jun 6". */
export function formatEntryShortDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric"
  }).format(date);
}

/** Compact week header — e.g. "Week of Jun 6". */
export function formatWeekOfShortLabel(weekStart: Date, timezone: string): string {
  return `Week of ${formatEntryShortDate(weekStart, timezone)}`;
}

export function formatWeekOfLabel(weekStart: Date, format: TimesheetDisplayFormat): string {
  return `Week of ${formatUserDate(weekStart, format.dateFormat, format.timezone)}`;
}

export function formatEntryDateLabel(date: Date, format: TimesheetDisplayFormat): string {
  return formatUserDate(date, format.dateFormat, format.timezone);
}
