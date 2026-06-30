import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { uuidSchema } from "./common.dto";

export const NotificationType = {
  PROJECT_ASSIGNMENT: "PROJECT_ASSIGNMENT",
  TASK_ASSIGNMENT: "TASK_ASSIGNMENT",
  TIMESHEET_REMINDER: "TIMESHEET_REMINDER",
  IDLE_TIMER_ALERT: "IDLE_TIMER_ALERT",
  JIRA_SYNC_UPDATE: "JIRA_SYNC_UPDATE",
  TIMESHEET_STATUS: "TIMESHEET_STATUS",
  APPROVAL_REQUEST: "APPROVAL_REQUEST",
  MEMBER_CHANGE: "MEMBER_CHANGE",
  WORKSPACE_ADDED: "WORKSPACE_ADDED",
  EXPORT_SCHEDULE: "EXPORT_SCHEDULE",
  BUDGET_ALERT: "BUDGET_ALERT",
  TIMESHEET_SUBMITTED: "TIMESHEET_SUBMITTED",
  TIMESHEET_APPROVED: "TIMESHEET_APPROVED",
  TIMESHEET_REJECTED: "TIMESHEET_REJECTED",
  TIMESHEET_AMENDMENT_REQUESTED: "TIMESHEET_AMENDMENT_REQUESTED",
  TIMESHEET_AMENDMENT_APPROVED: "TIMESHEET_AMENDMENT_APPROVED",
  TIMESHEET_AMENDMENT_DENIED: "TIMESHEET_AMENDMENT_DENIED",
  TIMER_AUTOSTOPPED: "TIMER_AUTOSTOPPED",
  PROJECT_UNASSIGNED: "PROJECT_UNASSIGNED",
  TASK_UNASSIGNED: "TASK_UNASSIGNED",
  WORKSPACE_REMOVED: "WORKSPACE_REMOVED",
  PROJECT_DEACTIVATED: "PROJECT_DEACTIVATED",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",
  TIMESHEET_MISSING_DIGEST: "TIMESHEET_MISSING_DIGEST"
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const notificationTypeSchema = z.nativeEnum(NotificationType);

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

export type NotificationDto = z.infer<typeof notificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
export type UpdateNotificationReadDto = z.infer<typeof updateNotificationReadSchema>;
export type MarkAllNotificationsReadDto = z.infer<typeof markAllNotificationsReadSchema>;
