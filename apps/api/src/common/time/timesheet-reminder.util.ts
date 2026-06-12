/** Local hour (0–23) on the last day of a timesheet period when reminders are sent. */
export const TIMESHEET_REMINDER_LOCAL_HOUR = 16;

export function getLocalHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export function isSameLocalCalendarDay(a: Date, b: Date, timeZone: string): boolean {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
  return fmt(a) === fmt(b);
}

export function isTimesheetReminderWindow(
  now: Date,
  periodEnd: Date,
  timeZone: string,
  reminderHour = TIMESHEET_REMINDER_LOCAL_HOUR
): boolean {
  if (!isSameLocalCalendarDay(now, periodEnd, timeZone)) {
    return false;
  }
  return getLocalHour(now, timeZone) >= reminderHour;
}

export function formatReminderDueLabel(periodEnd: Date, timeZone: string): string {
  return periodEnd.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}
