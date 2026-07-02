import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";
import { exportJobStatusSchema } from "./export.dto";

export const createTenantDataExportSchema = z.object({}).strict();

export type CreateTenantDataExportDto = z.infer<typeof createTenantDataExportSchema>;

export const tenantDataExportJobSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  requestedByUserId: uuidSchema,
  status: exportJobStatusSchema,
  filename: z.string().nullable(),
  contentType: z.string().nullable(),
  byteSize: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: isoDatetimeSchema,
  completedAt: isoDatetimeSchema.nullable(),
  expiresAt: isoDatetimeSchema.nullable()
});

export type TenantDataExportJobDto = z.infer<typeof tenantDataExportJobSchema>;

export const deleteTenantResponseSchema = z.object({
  ok: z.literal(true),
  deletedTenantId: uuidSchema
});

export type DeleteTenantResponseDto = z.infer<typeof deleteTenantResponseSchema>;
