import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { uuidSchema } from "./common.dto";

export const notificationTypeSchema = z.enum([
  "PROJECT_ASSIGNMENT",
  "TASK_ASSIGNMENT",
  "TIMESHEET_REMINDER",
  "IDLE_TIMER_ALERT",
  "JIRA_SYNC_UPDATE",
  "TIMESHEET_STATUS",
  "APPROVAL_REQUEST",
  "MEMBER_CHANGE",
  "WORKSPACE_ADDED",
  "EXPORT_SCHEDULE",
  "BUDGET_ALERT"
]);

export const notificationDetailRowSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200)
});

export const notificationMetadataSchema = z
  .object({
    href: z.string().max(500).optional(),
    projectId: uuidSchema.optional(),
    periodId: uuidSchema.optional(),
    taskId: uuidSchema.optional(),
    variant: z.enum(["success", "attention", "warning", "info"]).optional(),
    ctaLabel: z.string().max(80).optional(),
    preheader: z.string().max(200).optional(),
    details: z.array(notificationDetailRowSchema).max(6).optional()
  })
  .passthrough();

export const notificationSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  metadata: notificationMetadataSchema.optional()
});

export const listNotificationsQuerySchema = listPaginationQuerySchema.extend({
  unreadOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true")
});

export const listNotificationsResponseSchema =
  createPaginatedListResponseSchema(notificationSchema);

export const unreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative()
});

export const updateNotificationReadSchema = z.object({
  read: z.boolean()
});

export const markAllNotificationsReadSchema = z.object({
  unreadOnly: z.boolean().optional()
});

export const markAllNotificationsReadResponseSchema = z.object({
  updated: z.number().int().nonnegative()
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationDto = z.infer<typeof notificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
export type UpdateNotificationReadDto = z.infer<typeof updateNotificationReadSchema>;
export type MarkAllNotificationsReadDto = z.infer<typeof markAllNotificationsReadSchema>;
