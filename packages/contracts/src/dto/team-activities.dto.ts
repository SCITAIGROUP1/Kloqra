import { z } from "zod";
import { assertMaxDateRange, isoDatetimeSchema, uuidSchema } from "./common.dto";

export const teamActivityLatestSchema = z.object({
  taskName: z.string(),
  projectId: uuidSchema,
  projectName: z.string(),
  description: z.string().nullable(),
  durationSec: z.number().int().nonnegative(),
  endedAt: isoDatetimeSchema
});

export const teamActivityDaySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().nonnegative()
});

export const teamActivityMemberSchema = z.object({
  userId: uuidSchema,
  userName: z.string(),
  latestActivity: teamActivityLatestSchema.nullable(),
  periodTotalHours: z.number().nonnegative(),
  dailyHours: z.array(teamActivityDaySchema)
});

export const teamActivitiesSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  members: z.array(teamActivityMemberSchema)
});

export const teamActivitiesQuerySchema = z
  .object({
    from: isoDatetimeSchema.optional(),
    to: isoDatetimeSchema.optional(),
    timezone: z.string().optional(),
    projectId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    taskId: uuidSchema.optional(),
    userId: uuidSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to) assertMaxDateRange(value.from, value.to, ctx);
  });

export type TeamActivityLatestDto = z.infer<typeof teamActivityLatestSchema>;
export type TeamActivityDayDto = z.infer<typeof teamActivityDaySchema>;
export type TeamActivityMemberDto = z.infer<typeof teamActivityMemberSchema>;
export type TeamActivitiesDto = z.infer<typeof teamActivitiesSchema>;
export type TeamActivitiesQuery = z.infer<typeof teamActivitiesQuerySchema>;
