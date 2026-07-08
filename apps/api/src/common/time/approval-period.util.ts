import type { TimesheetApprovalPeriod, WorkspaceSettings } from "@kloqra/contracts";
import { DEFAULT_TIMESHEET_APPROVAL_PERIOD, parseWorkspaceSettings } from "@kloqra/contracts";

export type PeriodRange = {
  periodStart: Date;
  periodEnd: Date;
  approvalPeriod: TimesheetApprovalPeriod;
};

function timezoneOrUtc(settings: WorkspaceSettings): string {
  return settings.timezone?.trim() || "UTC";
}

function datePartsInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

function addCalendarDays(
  y: number,
  m: number,
  d: number,
  days: number
): {
  y: number;
  m: number;
  d: number;
} {
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return {
    y: next.getUTCFullYear(),
    m: next.getUTCMonth() + 1,
    d: next.getUTCDate()
  };
}

/** UTC instant for local midnight on Y-M-D in the given IANA timezone. */
function localMidnightUtc(y: number, m: number, d: number, timeZone: string): Date {
  if (timeZone === "UTC") {
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}

/** Exclusive next local midnight (DST-safe via calendar Y-M-D arithmetic). */
function nextLocalMidnightUtc(y: number, m: number, d: number, timeZone: string): Date {
  const next = addCalendarDays(y, m, d, 1);
  return localMidnightUtc(next.y, next.m, next.d, timeZone);
}

function endOfLocalDayUtc(y: number, m: number, d: number, timeZone: string): Date {
  return new Date(nextLocalMidnightUtc(y, m, d, timeZone).getTime() - 1);
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  if (timeZone === "UTC") return 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);

    let hour = getVal("hour");
    if (hour === 24) hour = 0;

    const tzDateUtc = Date.UTC(
      getVal("year"),
      getVal("month") - 1,
      getVal("day"),
      hour,
      getVal("minute"),
      getVal("second")
    );

    return tzDateUtc - date.getTime();
  } catch {
    return 0;
  }
}

/** Local weekday 0=Sun..6=Sat for Y-M-D in zone. */
function localWeekday(y: number, m: number, d: number, timeZone: string): number {
  const midnight = localMidnightUtc(y, m, d, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(midnight);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return map[weekday] ?? 0;
}

function weekStartParts(
  y: number,
  m: number,
  d: number,
  timeZone: string,
  weekStart: WorkspaceSettings["weekStart"]
): { y: number; m: number; d: number } {
  const day = localWeekday(y, m, d, timeZone);
  const diff = weekStart === "sunday" ? -day : day === 0 ? -6 : 1 - day;
  return addCalendarDays(y, m, d, diff);
}

export function resolveApprovalPeriod(
  projectPeriod: string | null | undefined,
  workspaceSettings: WorkspaceSettings
): TimesheetApprovalPeriod {
  if (projectPeriod === "daily" || projectPeriod === "weekly" || projectPeriod === "monthly") {
    return projectPeriod;
  }
  return workspaceSettings.timesheetApprovalPeriod ?? DEFAULT_TIMESHEET_APPROVAL_PERIOD;
}

export function getPeriodRange(
  dateInput: string | Date,
  approvalPeriod: TimesheetApprovalPeriod,
  workspaceSettings: WorkspaceSettings
): PeriodRange {
  const date = new Date(dateInput);
  const tz = timezoneOrUtc(workspaceSettings);

  if (approvalPeriod === "daily") {
    const { y, m, d } = datePartsInTimezone(date, tz);
    return {
      periodStart: localMidnightUtc(y, m, d, tz),
      periodEnd: endOfLocalDayUtc(y, m, d, tz),
      approvalPeriod
    };
  }

  if (approvalPeriod === "monthly") {
    const { y, m } = datePartsInTimezone(date, tz);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return {
      periodStart: localMidnightUtc(y, m, 1, tz),
      periodEnd: endOfLocalDayUtc(y, m, lastDay, tz),
      approvalPeriod
    };
  }

  // Weekly: workspace TZ week containing the local calendar day of the instant
  // (matches docs/specs/submissions.md — never bare UTC weekday math).
  const { y, m, d } = datePartsInTimezone(date, tz);
  const weekStartPref = workspaceSettings.weekStart ?? "monday";
  const startParts = weekStartParts(y, m, d, tz, weekStartPref);
  const endParts = addCalendarDays(startParts.y, startParts.m, startParts.d, 6);
  return {
    periodStart: localMidnightUtc(startParts.y, startParts.m, startParts.d, tz),
    periodEnd: endOfLocalDayUtc(endParts.y, endParts.m, endParts.d, tz),
    approvalPeriod
  };
}

export function formatPeriodLabel(
  periodStart: Date,
  approvalPeriod: TimesheetApprovalPeriod
): string {
  if (approvalPeriod === "daily") {
    return periodStart.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }
  if (approvalPeriod === "monthly") {
    return periodStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return `Week of ${periodStart.toISOString().slice(0, 10)}`;
}

export function parseWorkspaceSettingsFromRaw(raw: unknown): WorkspaceSettings {
  return parseWorkspaceSettings(raw);
}
