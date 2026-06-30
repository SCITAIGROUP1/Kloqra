import { z } from "zod";
import {
  assertMaxDateRange,
  isoDatetimeSchema,
  timelogSourceSchema,
  uuidSchema,
  queryUuidArraySchema
} from "./common.dto";

export const timeLogSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  taskId: uuidSchema,
  startTime: isoDatetimeSchema,
  endTime: isoDatetimeSchema,
  durationSec: z.number().int().nonnegative(),
  description: z.string().max(2000).nullable(),
  isBillable: z.boolean(),
  source: timelogSourceSchema
});

export const createTimeLogSchema = z
  .object({
    taskId: uuidSchema,
    startTime: isoDatetimeSchema,
    endTime: isoDatetimeSchema,
    description: z.string().max(2000).optional(),
    isBillable: z.boolean().optional()
  })
  .refine((v) => new Date(v.endTime) >= new Date(v.startTime), {
    message: "endTime must be >= startTime",
    path: ["endTime"]
  });

export const updateTimeLogSchema = z
  .object({
    taskId: uuidSchema.optional(),
    startTime: isoDatetimeSchema.optional(),
    endTime: isoDatetimeSchema.optional(),
    description: z.string().max(2000).nullable().optional(),
    isBillable: z.boolean().optional()
  })
  .refine(
    (v) => {
      if (v.startTime && v.endTime) {
        return new Date(v.endTime) >= new Date(v.startTime);
      }
      return true;
    },
    { message: "endTime must be >= startTime", path: ["endTime"] }
  );

const listTimeLogsBillableOnlySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === true || value === "true";
  });

export const listTimeLogsQuerySchema = z
  .object({
    taskId: uuidSchema.optional(),
    projectId: queryUuidArraySchema,
    categoryId: uuidSchema.optional(),
    userId: queryUuidArraySchema,
    from: isoDatetimeSchema.optional(),
    to: isoDatetimeSchema.optional(),
    search: z.string().trim().min(1).max(200).optional(),
    billableOnly: listTimeLogsBillableOnlySchema,
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    cursor: z.string().optional()
  })
  .superRefine((v, ctx) => {
    if (v.from && v.to) assertMaxDateRange(v.from, v.to, ctx);
  });

export const listTimeLogsResponseSchema = z.object({
  items: z.array(timeLogSchema),
  nextCursor: z.string().optional()
});

export const createBatchTimeLogsSchema = z
  .object({
    taskId: uuidSchema,
    localStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
    localEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    recurrence: z.enum(["daily", "weekdays", "weekly"]),
    timezone: z.string(),
    description: z.string().max(2000).optional(),
    isBillable: z.boolean().optional()
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be >= startDate",
        path: ["endDate"]
      });
    }
    if (v.localEndTime <= v.localStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "localEndTime must be > localStartTime",
        path: ["localEndTime"]
      });
    }
  });

export const batchTimeLogsResponseSchema = z.object({
  createdCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  items: z.array(timeLogSchema),
  skipped: z.array(
    z.object({
      date: z.string(),
      reason: z.string()
    })
  )
});

export type TimeLogDto = z.infer<typeof timeLogSchema>;
export type CreateTimeLogDto = z.infer<typeof createTimeLogSchema>;
export type UpdateTimeLogDto = z.infer<typeof updateTimeLogSchema>;
export type ListTimeLogsQueryDto = z.infer<typeof listTimeLogsQuerySchema>;
export type ListTimeLogsResponseDto = z.infer<typeof listTimeLogsResponseSchema>;
export type CreateBatchTimeLogsDto = z.infer<typeof createBatchTimeLogsSchema>;
export type BatchTimeLogsResponseDto = z.infer<typeof batchTimeLogsResponseSchema>;
