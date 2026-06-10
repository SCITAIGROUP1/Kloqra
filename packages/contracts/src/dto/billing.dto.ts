import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const hourlyRateSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  userId: uuidSchema.nullable(),
  projectId: uuidSchema.nullable(),
  rate: z.number().positive(),
  effectiveFrom: isoDatetimeSchema
});

export const createHourlyRateSchema = z.object({
  userId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  rate: z.number().positive(),
  effectiveFrom: isoDatetimeSchema.optional()
});

export const billableSummarySchema = z.object({
  totalHours: z.number(),
  billableHours: z.number(),
  totalAmount: z.number(),
  currency: z.literal("USD")
});

export const listHourlyRatesQuerySchema = listPaginationQuerySchema.extend({
  userId: uuidSchema.optional(),
  projectId: uuidSchema.optional()
});

export const listHourlyRatesResponseSchema = createPaginatedListResponseSchema(hourlyRateSchema);

export type HourlyRateDto = z.infer<typeof hourlyRateSchema>;
export type CreateHourlyRateDto = z.infer<typeof createHourlyRateSchema>;
export type BillableSummaryDto = z.infer<typeof billableSummarySchema>;
export type ListHourlyRatesQuery = z.infer<typeof listHourlyRatesQuerySchema>;
export type ListHourlyRatesResponse = z.infer<typeof listHourlyRatesResponseSchema>;
