import { z } from "zod";
import { notificationPreferenceSchema, themePreferenceSchema } from "./user-preferences";
import { normalizeNotificationChannels, type NotificationChannels } from "./user-preferences";

export const platformNotificationKeySchema = z.enum([
  "tenantLifecycle",
  "queueFailures",
  "subscriptionDrift",
  "securityAlerts",
  "ticketNotifications"
]);

export type PlatformNotificationKey = z.infer<typeof platformNotificationKeySchema>;

export const platformNotificationsSchema = z.object({
  enabled: z.boolean(),
  tenantLifecycle: notificationPreferenceSchema,
  queueFailures: notificationPreferenceSchema,
  subscriptionDrift: notificationPreferenceSchema,
  securityAlerts: notificationPreferenceSchema,
  ticketNotifications: notificationPreferenceSchema
});

export type PlatformNotifications = z.infer<typeof platformNotificationsSchema>;

export const platformPreferencesSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    notifications: platformNotificationsSchema.partial().optional()
  })
  .passthrough();

export type PlatformPreferences = z.infer<typeof platformPreferencesSchema>;

const platformChannelDefaults: Record<PlatformNotificationKey, NotificationChannels> = {
  tenantLifecycle: { inApp: true, email: true },
  queueFailures: { inApp: true, email: true },
  subscriptionDrift: { inApp: true, email: false },
  securityAlerts: { inApp: true, email: true },
  ticketNotifications: { inApp: true, email: true }
};

export type ResolvedPlatformNotifications = {
  enabled: boolean;
  tenantLifecycle: NotificationChannels;
  queueFailures: NotificationChannels;
  subscriptionDrift: NotificationChannels;
  securityAlerts: NotificationChannels;
  ticketNotifications: NotificationChannels;
};

export const DEFAULT_PLATFORM_NOTIFICATIONS: ResolvedPlatformNotifications = {
  enabled: true,
  ...platformChannelDefaults
};

export function platformNotificationKeys(): PlatformNotificationKey[] {
  return platformNotificationKeySchema.options;
}

export function parsePlatformPreferences(raw: unknown): PlatformPreferences {
  const parsed = platformPreferencesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

function mergePlatformNotificationKey(
  current: Partial<PlatformNotifications> | undefined,
  partial: Partial<PlatformNotifications> | undefined,
  key: PlatformNotificationKey
) {
  return partial?.[key] ?? current?.[key] ?? DEFAULT_PLATFORM_NOTIFICATIONS[key];
}

export function mergePlatformPreferences(
  current: PlatformPreferences,
  partial: Partial<PlatformPreferences>
): PlatformPreferences {
  const merged: PlatformPreferences = { ...current, ...partial };
  if (partial.notifications) {
    const cur = current.notifications;
    const part = partial.notifications;
    merged.notifications = {
      enabled: part.enabled ?? cur?.enabled ?? DEFAULT_PLATFORM_NOTIFICATIONS.enabled,
      tenantLifecycle: mergePlatformNotificationKey(cur, part, "tenantLifecycle"),
      queueFailures: mergePlatformNotificationKey(cur, part, "queueFailures"),
      subscriptionDrift: mergePlatformNotificationKey(cur, part, "subscriptionDrift"),
      securityAlerts: mergePlatformNotificationKey(cur, part, "securityAlerts"),
      ticketNotifications: mergePlatformNotificationKey(cur, part, "ticketNotifications")
    };
  }
  return merged;
}

export function resolveEffectivePlatformNotifications(
  preferences: PlatformPreferences
): ResolvedPlatformNotifications {
  const partial: Partial<PlatformNotifications> = preferences.notifications ?? {};
  const resolve = (key: PlatformNotificationKey) =>
    normalizeNotificationChannels(partial[key], DEFAULT_PLATFORM_NOTIFICATIONS[key]);

  return {
    enabled: partial.enabled ?? DEFAULT_PLATFORM_NOTIFICATIONS.enabled,
    tenantLifecycle: resolve("tenantLifecycle"),
    queueFailures: resolve("queueFailures"),
    subscriptionDrift: resolve("subscriptionDrift"),
    securityAlerts: resolve("securityAlerts"),
    ticketNotifications: resolve("ticketNotifications")
  };
}

export function resolvePlatformNotificationChannels(
  preferences: PlatformPreferences,
  key: PlatformNotificationKey
): NotificationChannels {
  const resolved = resolveEffectivePlatformNotifications(preferences);
  if (!resolved.enabled) {
    return { inApp: false, email: false };
  }
  return resolved[key];
}

export const updatePlatformPreferencesSchema = platformPreferencesSchema.partial();

export type UpdatePlatformPreferencesDto = z.infer<typeof updatePlatformPreferencesSchema>;
