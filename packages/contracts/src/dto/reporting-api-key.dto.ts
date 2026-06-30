import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

/** HTTP header names for public reporting API authentication. */
export const reportingApiKeyHeaders = {
  API_KEY: "x-api-key",
  API_SECRET: "x-api-secret"
} as const;

export const createReportingApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  projectIds: z.array(uuidSchema).min(1),
  expiresAt: isoDatetimeSchema.optional()
});

export const updateReportingApiKeySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  projectIds: z.array(uuidSchema).min(1).optional(),
  isActive: z.boolean().optional(),
  expiresAt: isoDatetimeSchema.nullable().optional()
});

export const reportingApiKeySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  apiKey: z.string(),
  projectIds: z.array(uuidSchema),
  isActive: z.boolean(),
  lastUsedAt: isoDatetimeSchema.nullable(),
  expiresAt: isoDatetimeSchema.nullable(),
  createdAt: isoDatetimeSchema
});

export const createReportingApiKeyResponseSchema = reportingApiKeySchema.extend({
  secret: z.string().min(1)
});

export const reportingApiKeyListSchema = z.object({
  items: z.array(reportingApiKeySchema)
});

export type CreateReportingApiKeyDto = z.infer<typeof createReportingApiKeySchema>;
export type UpdateReportingApiKeyDto = z.infer<typeof updateReportingApiKeySchema>;
export type ReportingApiKeyDto = z.infer<typeof reportingApiKeySchema>;
export type CreateReportingApiKeyResponseDto = z.infer<typeof createReportingApiKeyResponseSchema>;
