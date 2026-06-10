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

/** UTC midnight at the start of the week containing `date`. */
export function getWeekStartDate(
  date: Date,
  weekStart: WorkspaceSettings["weekStart"] = "monday"
): Date {
  return new Date(`${getWeekStartUtc(date, weekStart)}T00:00:00.000Z`);
}
