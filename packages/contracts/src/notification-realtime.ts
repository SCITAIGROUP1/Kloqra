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
  "timelogs",
  "projects",
  "tasks",
  "pending_approvals"
]);

export type WorkspaceDataInvalidateScope = z.infer<typeof workspaceDataInvalidateScopeSchema>;

/** Socket.IO event: workspace caches should refetch (timelogs, submissions, etc.). */
export const WORKSPACE_DATA_STALE_SOCKET_EVENT = "workspace.data.stale";

export const workspaceDataStaleEventSchema = z.object({
  workspaceId: z.string().uuid(),
  scopes: z.array(workspaceDataInvalidateScopeSchema).min(1),
  actorUserId: z.string().uuid().optional()
});

export type WorkspaceDataStaleEvent = z.infer<typeof workspaceDataStaleEventSchema>;
