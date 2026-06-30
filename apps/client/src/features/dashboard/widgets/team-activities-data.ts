import type { TeamActivityDayDto } from "@kloqra/contracts";
import { todayInZone, type DashboardPeriodSelection } from "@kloqra/web-shared";

export function formatDurationSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

export function formatWeekHours(hours: number): string {
  if (hours === 0) return "0h";
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}

export function formatTimeSince(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(iso).toLocaleDateString();
}

export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function dayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function dayChartLabel(dateKey: string, dayCount: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (dayCount <= 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function dayTooltipLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function isTodayDateKey(dateKey: string, timezone?: string): boolean {
  const resolvedTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = todayInZone(resolvedTz);
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return dateKey === `${y}-${m}-${d}`;
}

/** Show axis labels sparsely so month-long periods stay readable. */
export function shouldShowDayLabel(index: number, dayCount: number): boolean {
  if (dayCount <= 7) return true;
  if (dayCount <= 14) return index % 2 === 0 || index === dayCount - 1;
  const step = Math.max(2, Math.ceil(dayCount / 6));
  return index % step === 0 || index === dayCount - 1;
}

export function sparklineMinWidthPx(dayCount: number): number | undefined {
  if (dayCount <= 7) return undefined;
  return dayCount * 14;
}

export function sparklineBarHeightPx(hours: number, maxDayHours: number): number {
  if (hours <= 0 || maxDayHours <= 0) return 0;
  const ratio = hours / maxDayHours;
  return Math.max(4, Math.round(ratio * 36));
}

export function teamActivitiesPeriodTotalLabel(range: DashboardPeriodSelection): string {
  if (range === "today") return "Today";
  if (range === "week") return "This week";
  if (range === "month") return "This month";
  return "Period";
}

export type TeamActivitiesFilters = {
  from: string;
  to: string;
  timezone?: string;
  projectId?: string;
  categoryId?: string;
  taskId?: string;
  userId?: string;
};

export function buildTeamActivitiesQuery(filters: TeamActivitiesFilters): string {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to
  });
  if (filters.timezone) params.set("timezone", filters.timezone);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.taskId) params.set("taskId", filters.taskId);
  if (filters.userId) params.set("userId", filters.userId);
  return params.toString();
}

export function countActiveTeamActivityFilters(filters: TeamActivitiesFilters): number {
  let count = 0;
  if (filters.projectId) count += 1;
  if (filters.categoryId) count += 1;
  if (filters.taskId) count += 1;
  if (filters.userId) count += 1;
  return count;
}

export function maxDailyHours(days: TeamActivityDayDto[]): number {
  return days.reduce((max, day) => Math.max(max, day.hours), 0);
}
