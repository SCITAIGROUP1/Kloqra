import type { TimeLogDto } from "@kloqra/contracts";
import {
  formatDuration,
  fromDateKey,
  startOfWeekWithPreference,
  toDateKey,
  toDateKeyInZone
} from "../timesheet/calendar-utils";
import { formatWeekOfShortLabel, type TimesheetDisplayFormat } from "../timesheet/display-format";

export type WeekLogGroup = {
  weekStart: Date;
  weekKey: string;
  logs: TimeLogDto[];
  totalSec: number;
  billableSec: number;
};

function logDayInZone(log: TimeLogDto, timezone: string): Date {
  const key = toDateKeyInZone(new Date(log.startTime), timezone);
  return fromDateKey(key);
}

function weekKeyFromDay(day: Date): string {
  return toDateKey(day);
}

export function formatWeekSectionLabel(
  weekStart: Date,
  timezone: string,
  _displayFormat?: TimesheetDisplayFormat
): string {
  return formatWeekOfShortLabel(weekStart, timezone);
}

export function formatHoursCompact(sec: number): string {
  const hours = sec / 3600;
  if (hours === 0) return "0h";
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
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
  return `Total: ${formatHoursCompact(totalSec)} · Billable: ${formatHoursCompact(billableSec)}`;
}

export { formatDuration };
