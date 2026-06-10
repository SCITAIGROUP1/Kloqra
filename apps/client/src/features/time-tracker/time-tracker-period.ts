import {
  addDays,
  localMidnightUtcInZone,
  startOfMonth,
  startOfWeekWithPreference,
  todayInZone
} from "../timesheet/calendar-utils";

export type TimeTrackerPeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year";

export const TIME_TRACKER_PERIOD_LABELS: Record<TimeTrackerPeriodPreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  last_year: "Last Year"
};

export const TIME_TRACKER_PERIOD_PRESETS: TimeTrackerPeriodPreset[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year"
];

export type TimeTrackerVisibleRange = {
  from: Date;
  to: Date;
};

function dayBoundsInZone(day: Date, timezone: string): TimeTrackerVisibleRange {
  const y = day.getFullYear();
  const m = day.getMonth() + 1;
  const d = day.getDate();
  const from = localMidnightUtcInZone(y, m, d, timezone);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

function monthBoundsInZone(day: Date, timezone: string): TimeTrackerVisibleRange {
  const monthStart = startOfMonth(day);
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth() + 1;
  const from = localMidnightUtcInZone(y, m, 1, timezone);
  const lastDay = new Date(y, m, 0).getDate();
  const to = new Date(
    localMidnightUtcInZone(y, m, lastDay, timezone).getTime() + 24 * 60 * 60 * 1000
  );
  return { from, to };
}

function yearBoundsInZone(year: number, timezone: string): TimeTrackerVisibleRange {
  const from = localMidnightUtcInZone(year, 1, 1, timezone);
  const to = localMidnightUtcInZone(year + 1, 1, 1, timezone);
  return { from, to };
}

export function resolveTimeTrackerPeriod(
  preset: TimeTrackerPeriodPreset,
  timezone: string,
  weekStartPref: "monday" | "sunday" = "monday",
  referenceDate?: Date
): TimeTrackerVisibleRange {
  const today = referenceDate ?? todayInZone(timezone);

  if (preset === "today") {
    return dayBoundsInZone(today, timezone);
  }

  if (preset === "yesterday") {
    return dayBoundsInZone(addDays(today, -1), timezone);
  }

  if (preset === "this_week") {
    const weekStart = startOfWeekWithPreference(today, weekStartPref);
    const y = weekStart.getFullYear();
    const m = weekStart.getMonth() + 1;
    const d = weekStart.getDate();
    const from = localMidnightUtcInZone(y, m, d, timezone);
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  if (preset === "last_week") {
    const thisWeekStart = startOfWeekWithPreference(today, weekStartPref);
    const lastWeekStart = addDays(thisWeekStart, -7);
    const y = lastWeekStart.getFullYear();
    const m = lastWeekStart.getMonth() + 1;
    const d = lastWeekStart.getDate();
    const from = localMidnightUtcInZone(y, m, d, timezone);
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  if (preset === "last_month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return monthBoundsInZone(lastMonth, timezone);
  }

  if (preset === "this_year") {
    return yearBoundsInZone(today.getFullYear(), timezone);
  }

  if (preset === "last_year") {
    return yearBoundsInZone(today.getFullYear() - 1, timezone);
  }

  return monthBoundsInZone(today, timezone);
}

export function periodStatLabel(preset: TimeTrackerPeriodPreset): string {
  return TIME_TRACKER_PERIOD_LABELS[preset];
}
