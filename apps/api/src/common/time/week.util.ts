import type { WorkspaceSettings } from "@kloqra/contracts";

export function getWeekStartUtc(
  date: Date,
  weekStart: WorkspaceSettings["weekStart"] = "monday"
): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = weekStart === "sunday" ? -day : day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekStart: string): string {
  return `Week of ${weekStart}`;
}

export function daysInRange(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/** Inclusive UTC Mon–Fri count between `from` and `to` (date portion). */
export function countWeekdaysInclusive(from: Date, to: Date): number {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Math.max(1, count);
}

export function expectedHoursForRange(from: Date, to: Date, expectedWeeklyHours: number): number {
  const weekdays = countWeekdaysInclusive(from, to);
  return (expectedWeeklyHours / 5) * weekdays;
}

/** UTC midnight at the start of the week containing `date`. */
export function getWeekStartDate(
  date: Date,
  weekStart: WorkspaceSettings["weekStart"] = "monday"
): Date {
  return new Date(`${getWeekStartUtc(date, weekStart)}T00:00:00.000Z`);
}
