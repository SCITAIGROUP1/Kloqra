import {
  mergeDashboardLayoutUpdate,
  parseUserPreferences,
  type DashboardApp,
  type WidgetLayoutItemDto
} from "@kloqra/contracts";

/** Member client dashboard — default for all seeded member accounts. */
export const SEED_CLIENT_DASHBOARD_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "stat_total_hours_today", x: 0, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_total_hours", x: 3, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_billable", x: 9, y: 0, w: 3, h: 2, visible: false },
  { i: "stat_projects", x: 6, y: 0, w: 3, h: 2, visible: true },
  { i: "weekly_progress", x: 0, y: 6, w: 8, h: 4, visible: true },
  { i: "project_split", x: 8, y: 2, w: 4, h: 4, visible: true },
  { i: "category_split", x: 8, y: 10, w: 4, h: 4, visible: true },
  { i: "quick_timer", x: 0, y: 2, w: 8, h: 4, visible: true },
  { i: "daily_progress", x: 8, y: 6, w: 4, h: 4, visible: true },
  { i: "pinned_favorites", x: 0, y: 6, w: 3, h: 3, visible: false },
  { i: "recent_activity", x: 9, y: 14, w: 3, h: 3, visible: false },
  { i: "today_logs", x: 0, y: 10, w: 8, h: 4, visible: true },
  { i: "timesheet_submissions", x: 6, y: 13, w: 6, h: 3, visible: false }
];

/** Admin dashboard — default for all seeded admin accounts (Avery Admin Acme layout). */
export const SEED_ADMIN_DASHBOARD_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "stat_total_hours", x: 4, y: 0, w: 4, h: 2, visible: true },
  { i: "stat_billable", x: 0, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_nonbillable", x: 2, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_revenue", x: 2, y: 0, w: 2, h: 2, visible: false },
  { i: "stat_projects", x: 8, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_members", x: 10, y: 0, w: 2, h: 2, visible: true },
  { i: "active_timers", x: 0, y: 2, w: 2, h: 2, visible: false },
  { i: "daily_chart", x: 0, y: 7, w: 12, h: 6, visible: true },
  { i: "weekly_chart", x: 0, y: 2, w: 7, h: 5, visible: true },
  { i: "revenue_trend", x: 6, y: 11, w: 6, h: 4, visible: false },
  { i: "time_of_day_heatmap", x: 0, y: 16, w: 8, h: 4, visible: false },
  { i: "distribution_donut", x: 7, y: 13, w: 5, h: 4, visible: true },
  { i: "billable_split_donut", x: 0, y: 16, w: 3, h: 4, visible: false },
  { i: "billability_gauge", x: 3, y: 16, w: 3, h: 4, visible: false },
  { i: "task_breakdown", x: 6, y: 22, w: 4, h: 5, visible: false },
  { i: "category_distribution", x: 0, y: 21, w: 5, h: 5, visible: false },
  { i: "category_breakdown", x: 5, y: 21, w: 7, h: 5, visible: false },
  { i: "category_project_heatmap", x: 0, y: 13, w: 7, h: 4, visible: true },
  { i: "budget_burndown", x: 6, y: 2, w: 6, h: 5, visible: false },
  { i: "revenue_by_project", x: 0, y: 21, w: 6, h: 5, visible: false },
  { i: "project_health", x: 6, y: 21, w: 6, h: 5, visible: false },
  { i: "rate_efficiency", x: 0, y: 26, w: 6, h: 5, visible: false },
  { i: "team_utilization", x: 7, y: 2, w: 5, h: 5, visible: true },
  { i: "hours_by_member", x: 0, y: 31, w: 12, h: 5, visible: false },
  { i: "breakdown_table", x: 0, y: 11, w: 7, h: 5, visible: false },
  { i: "member_leaderboard", x: 0, y: 36, w: 4, h: 5, visible: false },
  { i: "hourly_rates", x: 4, y: 36, w: 4, h: 4, visible: false },
  { i: "live_presence", x: 8, y: 36, w: 4, h: 4, visible: false },
  { i: "pending_timesheets", x: 0, y: 17, w: 12, h: 5, visible: true }
];

export function buildPreferencesWithDashboardLayouts(
  existing: unknown,
  workspaceId: string,
  app: DashboardApp,
  layout: WidgetLayoutItemDto[],
  defaultLayout: WidgetLayoutItemDto[]
) {
  const preferences = parseUserPreferences(existing);
  return mergeDashboardLayoutUpdate(preferences, workspaceId, {
    app,
    layout,
    defaultLayout
  });
}
