import { z } from "zod";
import {
  assertMaxDateRange,
  isoDatetimeSchema,
  uuidSchema,
  queryUuidArraySchema
} from "./common.dto";
import { dashboardReportSchema, utilizationResponseSchema } from "./reporting.dto";

/** KPI stat cards — not shareable (too small / redundant as links). */
export const WIDGET_SHARE_STAT_IDS = [
  "stat_total_hours",
  "stat_billable",
  "stat_nonbillable",
  "stat_revenue",
  "stat_projects",
  "stat_members"
] as const;

/** Widgets that can be shared from the dashboard. */
export const WIDGET_SHARE_TIER1_IDS = [
  "daily_chart",
  "weekly_chart",
  "revenue_trend",
  "distribution_donut",
  "billable_split_donut",
  "billability_gauge",
  "category_distribution",
  "category_breakdown",
  "revenue_by_project",
  "project_health",
  "hours_by_member",
  "breakdown_table",
  "member_leaderboard",
  "team_utilization"
] as const;

export type WidgetShareTier1Id = (typeof WIDGET_SHARE_TIER1_IDS)[number];

export const WIDGET_SHARE_STORED_IDS = [
  ...WIDGET_SHARE_TIER1_IDS,
  ...WIDGET_SHARE_STAT_IDS
] as const;

export type WidgetShareStoredId = (typeof WIDGET_SHARE_STORED_IDS)[number];

/** Action/live widgets — never shareable. */
export const WIDGET_SHARE_BLOCKED_IDS = [
  "pending_timesheets",
  "live_presence",
  "active_timers"
] as const;

export const widgetShareIdSchema = z.enum(WIDGET_SHARE_TIER1_IDS);

export const widgetShareStoredIdSchema = z.enum(WIDGET_SHARE_STORED_IDS);

export const WIDGET_SHARE_LABELS: Record<WidgetShareStoredId, string> = {
  stat_total_hours: "Total Hours",
  stat_billable: "Billable Hours",
  stat_nonbillable: "Non-Billable",
  stat_revenue: "Revenue",
  stat_projects: "Active Projects",
  stat_members: "Active Members",
  daily_chart: "Daily Time Chart",
  weekly_chart: "Weekly Breakdown",
  revenue_trend: "Revenue Trend",
  distribution_donut: "Distribution Donut",
  billable_split_donut: "Billable Split",
  billability_gauge: "Billability Gauge",
  category_distribution: "Category Distribution",
  category_breakdown: "Category Breakdown",
  revenue_by_project: "Revenue by Project",
  project_health: "Project Health Matrix",
  hours_by_member: "Hours by Member",
  breakdown_table: "Breakdown Table",
  member_leaderboard: "Member Leaderboard",
  team_utilization: "Team Utilization"
};

export const widgetShareBodySchema = z
  .object({
    widgetId: widgetShareIdSchema,
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    projectId: queryUuidArraySchema,
    userId: queryUuidArraySchema,
    categoryId: uuidSchema.optional(),
    taskId: uuidSchema.optional(),
    options: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export const widgetShareStoredBodySchema = z
  .object({
    widgetId: widgetShareStoredIdSchema,
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    projectId: queryUuidArraySchema,
    userId: queryUuidArraySchema,
    categoryId: uuidSchema.optional(),
    taskId: uuidSchema.optional(),
    options: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export type WidgetShareBodyDto = z.infer<typeof widgetShareBodySchema>;

export const createWidgetShareSchema = z.object({
  body: widgetShareBodySchema,
  expiresInDays: z.number().int().min(1).max(90).default(30)
});

export type CreateWidgetShareDto = z.infer<typeof createWidgetShareSchema>;

export const widgetShareDtoSchema = z.object({
  id: uuidSchema,
  token: z.string(),
  expiresAt: isoDatetimeSchema,
  shareUrl: z.string()
});

export type WidgetShareDto = z.infer<typeof widgetShareDtoSchema>;

export const publicWidgetShareViewSchema = z.object({
  workspaceName: z.string(),
  widgetId: widgetShareStoredIdSchema,
  widgetLabel: z.string(),
  period: z.object({
    from: z.string(),
    to: z.string()
  }),
  generatedAt: isoDatetimeSchema,
  options: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  payload: z.union([dashboardReportSchema, utilizationResponseSchema])
});

export type PublicWidgetShareViewDto = z.infer<typeof publicWidgetShareViewSchema>;

export function isShareableWidgetId(id: string): id is WidgetShareTier1Id {
  return (WIDGET_SHARE_TIER1_IDS as readonly string[]).includes(id);
}

export function isUtilizationWidgetShare(
  view: Pick<PublicWidgetShareViewDto, "widgetId">
): view is PublicWidgetShareViewDto & { widgetId: "team_utilization" } {
  return view.widgetId === "team_utilization";
}
