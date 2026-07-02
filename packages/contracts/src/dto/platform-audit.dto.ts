import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const platformAuditActionSchema = z.enum([
  "platform.login",
  "platform.2fa.enabled",
  "platform.2fa.disabled",
  "platform.password.reset",
  "platform.tenant.created",
  "platform.tenant.updated",
  "platform.tenant.suspended",
  "platform.tenant.churned",
  "platform.tenant.deleted",
  "platform.plan.updated",
  "platform.catalog_settings.updated"
]);

export const platformAuditEventSchema = z.object({
  id: uuidSchema,
  actorPlatformUserId: uuidSchema,
  actorEmail: z.string().email(),
  actorName: z.string().min(1).max(120),
  action: platformAuditActionSchema,
  tenantId: uuidSchema.nullable(),
  summary: z.record(z.string(), z.unknown()),
  ipAddress: z.string().max(64).nullable(),
  userAgent: z.string().max(512).nullable(),
  createdAt: isoDatetimeSchema
});

export const listPlatformAuditEventsQuerySchema = listPaginationQuerySchema
  .omit({ search: true })
  .extend({
    tenantId: uuidSchema.optional(),
    action: platformAuditActionSchema.optional(),
    from: isoDatetimeSchema.optional(),
    to: isoDatetimeSchema.optional()
  });

export const listPlatformAuditEventsResponseSchema =
  createPaginatedListResponseSchema(platformAuditEventSchema);

export type PlatformAuditAction = z.infer<typeof platformAuditActionSchema>;
export type PlatformAuditEventDto = z.infer<typeof platformAuditEventSchema>;
export type ListPlatformAuditEventsQuery = z.infer<typeof listPlatformAuditEventsQuerySchema>;
export type ListPlatformAuditEventsResponseDto = z.infer<
  typeof listPlatformAuditEventsResponseSchema
>;
