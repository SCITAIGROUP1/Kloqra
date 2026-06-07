import type { TimesheetApprovalPeriod, WorkspaceSettings } from "@chronomint/contracts";
import { DEFAULT_TIMESHEET_APPROVAL_PERIOD, parseWorkspaceSettings } from "@chronomint/contracts";
import { getWeekStartDate } from "./week.util";

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

/** UTC instant for local midnight on Y-M-D in the given IANA timezone. */
function localMidnightUtc(y: number, m: number, d: number, timeZone: string): Date {
  if (timeZone === "UTC") {
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}

function endOfLocalDayUtc(y: number, m: number, d: number, timeZone: string): Date {
  const start = localMidnightUtc(y, m, d, timeZone);
  const nextDay = new Date(start);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return new Date(nextDay.getTime() - 1);
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utc = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
  const local = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
  const [uh, um, us] = utc.split(":").map(Number);
  const [lh, lm, ls] = local.split(":").map(Number);
  const utcSec = uh * 3600 + um * 60 + us;
  const localSec = lh * 3600 + lm * 60 + ls;
  return (localSec - utcSec) * 1000;
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

  const weekStartPref = workspaceSettings.weekStart ?? "monday";
  const periodStart = getWeekStartDate(date, weekStartPref);
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 6);
  periodEnd.setUTCHours(23, 59, 59, 999);

  return { periodStart, periodEnd, approvalPeriod };
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
