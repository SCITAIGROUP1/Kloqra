import { z } from "zod";
import { isoDatetimeSchema, timelogSourceSchema, uuidSchema } from "./common.dto";

export const timelogAuditActionSchema = z.enum(["CREATE", "UPDATE", "DELETE"]);

export const timelogAuditSnapshotSchema = z.object({
  taskId: uuidSchema,
  startTime: isoDatetimeSchema,
  endTime: isoDatetimeSchema,
  durationSec: z.number().int().nonnegative(),
  description: z.string().max(2000).nullable(),
  isBillable: z.boolean(),
  source: timelogSourceSchema
});

export const timelogAuditEventSchema = z.object({
  id: uuidSchema,
  timeLogId: uuidSchema,
  entryUserId: uuidSchema,
  actorId: uuidSchema,
  actorName: z.string(),
  action: timelogAuditActionSchema,
  before: timelogAuditSnapshotSchema.nullable(),
  after: timelogAuditSnapshotSchema.nullable(),
  createdAt: isoDatetimeSchema
});

export const listTimelogAuditEventsResponseSchema = z.object({
  items: z.array(timelogAuditEventSchema)
});

export type TimelogAuditAction = z.infer<typeof timelogAuditActionSchema>;
export type TimelogAuditSnapshot = z.infer<typeof timelogAuditSnapshotSchema>;
export type TimelogAuditEventDto = z.infer<typeof timelogAuditEventSchema>;
export type ListTimelogAuditEventsResponseDto = z.infer<
  typeof listTimelogAuditEventsResponseSchema
>;
