import type { TimeLogDto } from "@kloqra/contracts";
import {
  addDays,
  formatDuration,
  fromDateKey,
  startOfWeekWithPreference,
  toDateKey,
  toDateKeyInZone
} from "./calendar-utils";
import type { TimesheetDisplayFormat } from "./display-format";

export type WeekLogGroup = {
  weekStart: Date;
  weekKey: string;
  logs: TimeLogDto[];
  totalSec: number;
  billableSec: number;
};

export type DayLogGroup = {
  day: Date;
  dayKey: string;
  dayLabel: string;
  dateLabel: string;
  logs: TimeLogDto[];
  totalSec: number;
};

function logDayInZone(log: TimeLogDto, timezone: string): Date {
  const key = toDateKeyInZone(new Date(log.startTime), timezone);
  return fromDateKey(key);
}

function weekKeyFromDay(day: Date): string {
  return toDateKey(day);
}

function formatDayOfMonth(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    day: "numeric"
  }).format(date);
}

function formatMonthLong(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "long"
  }).format(date);
}

export function formatWeekSectionLabel(
  weekStart: Date,
  timezone: string,
  _displayFormat?: TimesheetDisplayFormat
): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = formatMonthLong(weekStart, timezone);
  const endMonth = formatMonthLong(weekEnd, timezone);
  const fromDay = formatDayOfMonth(weekStart, timezone);
  const toDay = formatDayOfMonth(weekEnd, timezone);

  if (startMonth === endMonth) {
    return `Week of ${startMonth} ${fromDay} to ${toDay}`;
  }
  return `Week of ${startMonth} ${fromDay} to ${endMonth} ${toDay}`;
}

export function formatHoursCompact(sec: number): string {
  const hours = sec / 3600;
  if (hours === 0) return "0h";
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

export function formatHoursDecimal(sec: number): string {
  const hours = sec / 3600;
  return hours.toFixed(2);
}

export function formatHoursDecimalWithSuffix(sec: number): string {
  return `${formatHoursDecimal(sec)}h`;
}

export function formatDayTabLabel(day: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  }).format(day);
}

export function formatDayTabDateLabel(day: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric"
  }).format(day);
}

export function defaultActiveDayKey(days: DayLogGroup[]): string {
  const withEntries = days.filter((day) => day.logs.length > 0);
  if (withEntries.length > 0) {
    return withEntries[withEntries.length - 1]!.dayKey;
  }
  return days[days.length - 1]?.dayKey ?? "";
}

export function groupLogsByWeek(
  logs: TimeLogDto[],
  timezone: string,
  weekStartPref: "monday" | "sunday" = "monday"
): WeekLogGroup[] {
  const groups = new Map<string, WeekLogGroup>();

  for (const log of logs) {
    const logDay = logDayInZone(log, timezone);
    const weekStart = startOfWeekWithPreference(logDay, weekStartPref);
    const weekKey = weekKeyFromDay(weekStart);
    const bucket =
      groups.get(weekKey) ??
      ({
        weekStart,
        weekKey,
        logs: [],
        totalSec: 0,
        billableSec: 0
      } satisfies WeekLogGroup);

    bucket.logs.push(log);
    bucket.totalSec += log.durationSec;
    if (log.isBillable) bucket.billableSec += log.durationSec;
    groups.set(weekKey, bucket);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      logs: [...group.logs].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
    }))
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
}

export function formatWeekTotals(totalSec: number, billableSec: number): string {
  return `Total: ${formatHoursDecimalWithSuffix(totalSec)} · Billable: ${formatHoursDecimalWithSuffix(billableSec)}`;
}

export function groupLogsByDay(
  logs: TimeLogDto[],
  timezone: string,
  weekStartPref: "monday" | "sunday" = "monday"
): DayLogGroup[] {
  const groups = new Map<string, DayLogGroup>();

  for (const log of logs) {
    const logDay = logDayInZone(log, timezone);
    const dayKey = toDateKey(logDay);
    const bucket =
      groups.get(dayKey) ??
      ({
        day: logDay,
        dayKey,
        dayLabel: formatDayTabLabel(logDay, timezone),
        dateLabel: formatDayTabDateLabel(logDay, timezone),
        logs: [],
        totalSec: 0
      } satisfies DayLogGroup);

    bucket.logs.push(log);
    bucket.totalSec += log.durationSec;
    groups.set(dayKey, bucket);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      logs: [...group.logs].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
    }))
    .sort((a, b) => {
      const weekA = startOfWeekWithPreference(a.day, weekStartPref).getTime();
      const weekB = startOfWeekWithPreference(b.day, weekStartPref).getTime();
      if (weekA !== weekB) return weekA - weekB;
      return a.day.getTime() - b.day.getTime();
    });
}

export function buildWeekDayTabs(
  weekStart: Date,
  logs: TimeLogDto[],
  timezone: string,
  weekStartPref: "monday" | "sunday",
  rangeFrom: string,
  rangeTo: string
): DayLogGroup[] {
  const logsByDay = groupLogsByDay(logs, timezone, weekStartPref);
  const logsMap = new Map(logsByDay.map((day) => [day.dayKey, day]));
  const days: DayLogGroup[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(weekStart, offset);
    const dayKey = toDateKey(day);
    if (dayKey < rangeFrom || dayKey > rangeTo) continue;

    const existing = logsMap.get(dayKey);
    days.push(
      existing ?? {
        day,
        dayKey,
        dayLabel: formatDayTabLabel(day, timezone),
        dateLabel: formatDayTabDateLabel(day, timezone),
        logs: [],
        totalSec: 0
      }
    );
  }

  return days;
}

export { formatDuration };
