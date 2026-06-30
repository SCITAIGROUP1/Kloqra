import {
  addDays,
  localMidnightUtcInZone,
  startOfMonth,
  startOfWeekWithPreference,
  todayInZone,
  toDateKeyInZone
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

export type TimeTrackerPeriodSelection = TimeTrackerPeriodPreset | "custom";

export const TIME_TRACKER_PERIOD_LABELS: Record<TimeTrackerPeriodSelection, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  last_year: "Last Year",
  custom: "Custom range"
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

function parseDateKey(key: string): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y, m, d];
}

/** Inclusive calendar-day keys for a preset's visible range. */
export function inclusiveDateKeysFromPeriod(
  preset: TimeTrackerPeriodPreset,
  timezone: string,
  weekStartPref: "monday" | "sunday" = "monday",
  referenceDate?: Date
): { from: string; to: string } {
  const { from, to } = resolveTimeTrackerPeriod(preset, timezone, weekStartPref, referenceDate);
  const lastInstant = new Date(to.getTime() - 1);
  return {
    from: toDateKeyInZone(from, timezone),
    to: toDateKeyInZone(lastInstant, timezone)
  };
}

/** Resolve inclusive date keys to an exclusive UTC query range. */
export function resolveTimeTrackerDateRange(
  fromKey: string,
  toKey: string,
  timezone: string
): TimeTrackerVisibleRange {
  let [fromY, fromM, fromD] = parseDateKey(fromKey);
  let [toY, toM, toD] = parseDateKey(toKey);

  const fromStart = localMidnightUtcInZone(fromY, fromM, fromD, timezone);
  const toStart = localMidnightUtcInZone(toY, toM, toD, timezone);
  if (fromStart.getTime() > toStart.getTime()) {
    [fromY, fromM, fromD, toY, toM, toD] = [toY, toM, toD, fromY, fromM, fromD];
  }

  const from = localMidnightUtcInZone(fromY, fromM, fromD, timezone);
  const toDayStart = localMidnightUtcInZone(toY, toM, toD, timezone);
  const to = new Date(toDayStart.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export function matchTimeTrackerPeriod(
  fromKey: string,
  toKey: string,
  timezone: string,
  weekStartPref: "monday" | "sunday" = "monday",
  referenceDate?: Date
): TimeTrackerPeriodSelection {
  for (const preset of TIME_TRACKER_PERIOD_PRESETS) {
    const keys = inclusiveDateKeysFromPeriod(preset, timezone, weekStartPref, referenceDate);
    if (keys.from === fromKey && keys.to === toKey) return preset;
  }
  return "custom";
}

export function formatTimeTrackerRangeLabel(
  fromKey: string,
  toKey: string,
  timezone: string
): string {
  const format = (key: string) => {
    const [y, m, d] = parseDateKey(key);
    const instant = localMidnightUtcInZone(y, m, d, timezone);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric"
    }).format(instant);
  };

  if (fromKey === toKey) return format(fromKey);
  return `${format(fromKey)} – ${format(toKey)}`;
}

export function periodLabelForSelection(
  selection: TimeTrackerPeriodSelection,
  fromKey: string,
  toKey: string,
  timezone: string
): string {
  if (selection !== "custom") return TIME_TRACKER_PERIOD_LABELS[selection];
  return formatTimeTrackerRangeLabel(fromKey, toKey, timezone);
}
