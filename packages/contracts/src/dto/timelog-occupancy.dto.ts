import { z } from "zod";
import {
  assertMaxDateRange,
  isoDatetimeSchema,
  timelogSourceSchema,
  uuidSchema
} from "./common.dto";

export const timeLogOccupancyItemSchema = z.object({
  id: uuidSchema,
  startTime: isoDatetimeSchema,
  endTime: isoDatetimeSchema,
  workspaceId: uuidSchema,
  workspaceName: z.string(),
  label: z.string(),
  source: timelogSourceSchema,
  isLocked: z.boolean()
});

export const listTimeLogOccupancyQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema
  })
  .superRefine((v, ctx) => {
    assertMaxDateRange(v.from, v.to, ctx);
  });

export const listTimeLogOccupancyResponseSchema = z.object({
  items: z.array(timeLogOccupancyItemSchema)
});

export type TimeLogOccupancyItemDto = z.infer<typeof timeLogOccupancyItemSchema>;
export type ListTimeLogOccupancyQueryDto = z.infer<typeof listTimeLogOccupancyQuerySchema>;
export type ListTimeLogOccupancyResponseDto = z.infer<typeof listTimeLogOccupancyResponseSchema>;
