import { z } from "zod";
import { platformNotificationSchema } from "./dto/platform-notification.dto";

/** Socket.IO namespace for platform in-app notification push (same namespace as tenant). */
export const PLATFORM_NOTIFICATIONS_SOCKET_NAMESPACE = "/notifications";

export const PLATFORM_NOTIFICATION_CREATED_EVENT = "platform.notification.created";

export const platformNotificationCreatedEventSchema = z.object({
  notification: platformNotificationSchema,
  unreadCount: z.number().int().nonnegative()
});

export type PlatformNotificationCreatedEvent = z.infer<
  typeof platformNotificationCreatedEventSchema
>;
