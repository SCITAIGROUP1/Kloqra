import { z } from "zod";
import { notificationSchema } from "./dto/notification.dto";

/** Socket.IO namespace for in-app notification push. */
export const NOTIFICATIONS_SOCKET_NAMESPACE = "/notifications";

export const NOTIFICATION_CREATED_EVENT = "notification.created";

export const notificationCreatedEventSchema = z.object({
  notification: notificationSchema,
  workspaceId: z.string().uuid(),
  unreadCount: z.number().int().nonnegative()
});

export type NotificationCreatedEvent = z.infer<typeof notificationCreatedEventSchema>;

export const workspaceDataInvalidateScopeSchema = z.enum([
  "submissions",
  "timesheet",
  "projects",
  "tasks",
  "pending_approvals"
]);

export type WorkspaceDataInvalidateScope = z.infer<typeof workspaceDataInvalidateScopeSchema>;
