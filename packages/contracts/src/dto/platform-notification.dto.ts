import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { uuidSchema } from "./common.dto";
import {
  markAllNotificationsReadResponseSchema,
  markAllNotificationsReadSchema,
  notificationMetadataSchema,
  unreadCountResponseSchema,
  updateNotificationReadSchema
} from "./notification.dto";

export const PlatformNotificationType = {
  TENANT_CREATED: "TENANT_CREATED",
  TENANT_UPDATED: "TENANT_UPDATED",
  TENANT_SUSPENDED: "TENANT_SUSPENDED",
  TENANT_CHURNED: "TENANT_CHURNED",
  TENANT_DELETED: "TENANT_DELETED",
  SUBSCRIPTION_DRIFT: "SUBSCRIPTION_DRIFT",
  QUEUE_FAILURE: "QUEUE_FAILURE",
  SECURITY_ALERT: "SECURITY_ALERT",
  SALES_INQUIRY: "SALES_INQUIRY",
  SALES_RECEIPT_UPLOADED: "SALES_RECEIPT_UPLOADED",
  TICKET_MENTION: "TICKET_MENTION",
  TICKET_ASSIGNED: "TICKET_ASSIGNED",
  TICKET_STATUS_CHANGED: "TICKET_STATUS_CHANGED"
} as const;

export type PlatformNotificationType =
  (typeof PlatformNotificationType)[keyof typeof PlatformNotificationType];

export const platformNotificationTypeSchema = z.nativeEnum(PlatformNotificationType);

export const platformNotificationSchema = z.object({
  id: uuidSchema,
  type: platformNotificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  metadata: notificationMetadataSchema.optional()
});

export const listPlatformNotificationsQuerySchema = listPaginationQuerySchema.extend({
  unreadOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true")
});

export const listPlatformNotificationsResponseSchema = createPaginatedListResponseSchema(
  platformNotificationSchema
);

export const platformNotificationPreferenceKeyMap: Record<
  PlatformNotificationType,
  "tenantLifecycle" | "queueFailures" | "subscriptionDrift" | "securityAlerts"
> = {
  TENANT_CREATED: "tenantLifecycle",
  TENANT_UPDATED: "tenantLifecycle",
  TENANT_SUSPENDED: "tenantLifecycle",
  TENANT_CHURNED: "tenantLifecycle",
  TENANT_DELETED: "tenantLifecycle",
  SALES_INQUIRY: "tenantLifecycle",
  SALES_RECEIPT_UPLOADED: "tenantLifecycle",
  SUBSCRIPTION_DRIFT: "subscriptionDrift",
  QUEUE_FAILURE: "queueFailures",
  SECURITY_ALERT: "securityAlerts",
  TICKET_MENTION: "securityAlerts",
  TICKET_ASSIGNED: "securityAlerts",
  TICKET_STATUS_CHANGED: "securityAlerts"
};

export type PlatformNotificationDto = z.infer<typeof platformNotificationSchema>;
export type ListPlatformNotificationsQuery = z.infer<typeof listPlatformNotificationsQuerySchema>;
export type ListPlatformNotificationsResponse = z.infer<
  typeof listPlatformNotificationsResponseSchema
>;

export {
  unreadCountResponseSchema as platformUnreadCountResponseSchema,
  updateNotificationReadSchema as updatePlatformNotificationReadSchema,
  markAllNotificationsReadSchema as markAllPlatformNotificationsReadSchema,
  markAllNotificationsReadResponseSchema as markAllPlatformNotificationsReadResponseSchema
};

export type UpdatePlatformNotificationReadDto = z.infer<typeof updateNotificationReadSchema>;
export type MarkAllPlatformNotificationsReadDto = z.infer<typeof markAllNotificationsReadSchema>;
