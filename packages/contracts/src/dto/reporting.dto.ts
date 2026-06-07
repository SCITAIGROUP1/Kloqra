import { z } from "zod";
import { assertMaxDateRange, isoDatetimeSchema, uuidSchema } from "./common.dto";

export const reportQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    projectId: uuidSchema.optional(),
    userId: uuidSchema.optional()
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
  billableAmount: z.number()
});

export const timeByUserSchema = hoursBreakdownSchema.extend({
  userId: uuidSchema,
  userName: z.string(),
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
    currency: z.literal("USD"),
    activeProjects: z.number(),
    activeMembers: z.number(),
    billablePercent: z.number()
  }),
  timeByProject: z.array(timeByProjectSchema),
  timeByUser: z.array(timeByUserSchema),
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

export const myWeekSummarySchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  todayHours: z.number(),
  weekTotalHours: z.number(),
  weekBillableHours: z.number(),
  byProject: z.array(myWeekProjectHoursSchema)
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
  totalHours: z.number().nonnegative(),
  billableHours: z.number().nonnegative()
});

export const taskBreakdownResponseSchema = z.object({
  tasks: z.array(taskBreakdownItemSchema)
});

export type TaskBreakdownResponseDto = z.infer<typeof taskBreakdownResponseSchema>;
