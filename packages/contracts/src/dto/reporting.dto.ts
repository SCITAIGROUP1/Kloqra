import { z } from "zod";
import { listPaginationQuerySchema } from "../pagination";
import {
  assertMaxDateRange,
  currencyCodeSchema,
  isoDatetimeSchema,
  uuidSchema,
  queryUuidArraySchema
} from "./common.dto";

export const reportQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    projectId: queryUuidArraySchema,
    userId: queryUuidArraySchema,
    categoryId: uuidSchema.optional(),
    taskId: uuidSchema.optional()
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export const hoursBreakdownSchema = z.object({
  totalHours: z.number(),
  billableHours: z.number(),
  nonBillableHours: z.number()
});

export const timeByProjectSchema = hoursBreakdownSchema.extend({
  projectId: uuidSchema,
  projectName: z.string(),
  billableAmount: z.number(),
  budgetHours: z.number().positive().nullable().optional(),
  percentUsed: z.number().nullable().optional(),
  budgetStatus: z.enum(["no_budget", "over_budget", "near_budget", "on_track"]).optional()
});

export const timeByUserSchema = hoursBreakdownSchema.extend({
  userId: uuidSchema,
  userName: z.string(),
  billableAmount: z.number()
});

export const timeByCategorySchema = hoursBreakdownSchema.extend({
  categoryId: uuidSchema,
  categoryName: z.string(),
  billableAmount: z.number()
});

export const weeklyHoursSchema = hoursBreakdownSchema.extend({
  weekStart: z.string(),
  billableAmount: z.number()
});

export const dailyHoursSchema = hoursBreakdownSchema.extend({
  date: z.string()
});

export const dailyProjectStackSchema = z.object({
  projectId: uuidSchema,
  projectName: z.string(),
  hours: z.number()
});

export const dailyByProjectRowSchema = z.object({
  date: z.string(),
  stacks: z.array(dailyProjectStackSchema)
});

export const dashboardReportSchema = z.object({
  period: z.object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  }),
  workspace: hoursBreakdownSchema.extend({
    totalAmount: z.number(),
    currency: currencyCodeSchema,
    activeProjects: z.number(),
    activeMembers: z.number(),
    billablePercent: z.number()
  }),
  timeByProject: z.array(timeByProjectSchema),
  timeByUser: z.array(timeByUserSchema),
  timeByCategory: z.array(timeByCategorySchema),
  weeklyHours: z.array(weeklyHoursSchema),
  dailyHours: z.array(dailyHoursSchema),
  /** Top projects per day for stacked “chart by project” bars */
  dailyByProject: z.array(dailyByProjectRowSchema)
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;
export type HoursBreakdownDto = z.infer<typeof hoursBreakdownSchema>;
export type DashboardReportDto = z.infer<typeof dashboardReportSchema>;

export const myWeekProjectHoursSchema = z.object({
  projectId: uuidSchema,
  projectName: z.string(),
  projectColor: z.string(),
  totalHours: z.number(),
  billableHours: z.number()
});

export const myWeekCategoryHoursSchema = z.object({
  categoryId: uuidSchema,
  categoryName: z.string(),
  totalHours: z.number(),
  billableHours: z.number()
});

export const myWeekSummarySchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  todayHours: z.number(),
  weekTotalHours: z.number(),
  weekBillableHours: z.number(),
  byProject: z.array(myWeekProjectHoursSchema),
  byCategory: z.array(myWeekCategoryHoursSchema)
});

export type MyWeekProjectHoursDto = z.infer<typeof myWeekProjectHoursSchema>;
export type MyWeekSummaryDto = z.infer<typeof myWeekSummarySchema>;

// Heatmap schemas
export const heatmapSlotSchema = z.object({
  hour: z.number().int().min(0).max(23),
  dayOfWeek: z.number().int().min(0).max(6),
  hours: z.number().nonnegative()
});

export const heatmapResponseSchema = z.object({
  slots: z.array(heatmapSlotSchema)
});

export type HeatmapResponseDto = z.infer<typeof heatmapResponseSchema>;

// Task breakdown schemas
export const taskBreakdownItemSchema = z.object({
  taskId: uuidSchema.nullable(),
  taskName: z.string(),
  categoryId: uuidSchema.optional(),
  categoryName: z.string().optional(),
  totalHours: z.number().nonnegative(),
  billableHours: z.number().nonnegative()
});

export const taskBreakdownResponseSchema = z.object({
  tasks: z.array(taskBreakdownItemSchema)
});

export type TaskBreakdownResponseDto = z.infer<typeof taskBreakdownResponseSchema>;

export const myWeekQuerySchema = z.object({
  categoryId: uuidSchema.optional()
});

export type MyWeekQueryDto = z.infer<typeof myWeekQuerySchema>;

export const categoryProjectHeatmapCellSchema = z.object({
  categoryId: uuidSchema,
  categoryName: z.string(),
  projectId: uuidSchema,
  projectName: z.string(),
  hours: z.number().nonnegative()
});

export const categoryProjectHeatmapResponseSchema = z.object({
  categories: z.array(z.object({ categoryId: uuidSchema, categoryName: z.string() })),
  projects: z.array(z.object({ projectId: uuidSchema, projectName: z.string() })),
  cells: z.array(categoryProjectHeatmapCellSchema)
});

export type CategoryProjectHeatmapResponseDto = z.infer<
  typeof categoryProjectHeatmapResponseSchema
>;

export const utilizationMemberSchema = z.object({
  userId: uuidSchema,
  userName: z.string(),
  loggedHours: z.number(),
  billableHours: z.number(),
  targetHours: z.number(),
  utilizationPct: z.number(),
  status: z.enum(["on_track", "low", "critical"])
});

export const utilizationQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    userId: queryUuidArraySchema,
    projectId: queryUuidArraySchema,
    categoryId: uuidSchema.optional(),
    taskId: uuidSchema.optional()
  })
  .merge(listPaginationQuerySchema)
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export const utilizationResponseSchema = z.object({
  period: z.object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  }),
  expectedWeeklyHours: z.number(),
  targetHours: z.number(),
  members: z.array(utilizationMemberSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type UtilizationMemberDto = z.infer<typeof utilizationMemberSchema>;
export type UtilizationQueryDto = z.infer<typeof utilizationQuerySchema>;
export type UtilizationResponseDto = z.infer<typeof utilizationResponseSchema>;

export const projectSummaryQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export const projectSummaryCategoryHoursSchema = z.object({
  categoryId: uuidSchema,
  categoryName: z.string(),
  totalHours: z.number().nonnegative(),
  billableHours: z.number().nonnegative()
});

export const projectSummaryMemberHoursSchema = z.object({
  userId: uuidSchema,
  userName: z.string(),
  totalHours: z.number().nonnegative(),
  billableHours: z.number().nonnegative()
});

export const projectSummarySchema = z.object({
  projectId: uuidSchema,
  projectName: z.string(),
  period: z.object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  }),
  totalHours: z.number().nonnegative(),
  billableHours: z.number().nonnegative(),
  nonBillableHours: z.number().nonnegative(),
  entryCount: z.number().int().nonnegative(),
  byTask: z.array(taskBreakdownItemSchema),
  byCategory: z.array(projectSummaryCategoryHoursSchema),
  byMember: z.array(projectSummaryMemberHoursSchema)
});

export type ProjectSummaryQueryDto = z.infer<typeof projectSummaryQuerySchema>;
export type ProjectSummaryDto = z.infer<typeof projectSummarySchema>;
