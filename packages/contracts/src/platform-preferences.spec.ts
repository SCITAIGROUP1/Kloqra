import { describe, expect, it } from "vitest";
import {
  PlatformNotificationType,
  platformNotificationPreferenceKeyMap
} from "./dto/platform-notification.dto";
import {
  resolveEffectivePlatformNotifications,
  resolvePlatformNotificationChannels
} from "./platform-preferences";

describe("platform preferences", () => {
  it("maps notification types to preference keys", () => {
    expect(platformNotificationPreferenceKeyMap[PlatformNotificationType.TENANT_CREATED]).toBe(
      "tenantLifecycle"
    );
    expect(platformNotificationPreferenceKeyMap[PlatformNotificationType.QUEUE_FAILURE]).toBe(
      "queueFailures"
    );
  });

  it("defaults platform notification channels to enabled", () => {
    const resolved = resolveEffectivePlatformNotifications({});
    expect(resolved.tenantLifecycle).toEqual({ inApp: true, email: true });
  });

  it("respects master notifications toggle", () => {
    const channels = resolvePlatformNotificationChannels(
      { notifications: { enabled: false } },
      "tenantLifecycle"
    );
    expect(channels).toEqual({ inApp: false, email: false });
  });
});
