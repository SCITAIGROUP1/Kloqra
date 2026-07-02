import { PlatformNotificationType } from "@kloqra/contracts";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlatformNotificationsRealtimeService } from "./platform-notifications-realtime.service";
import { PlatformNotificationsService } from "./platform-notifications.service";

describe("PlatformNotificationsService", () => {
  const mockPrisma = {
    platformNotification: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn()
    }
  };

  const mockRealtime = {
    publishNotificationCreated: vi.fn().mockResolvedValue(undefined)
  };

  let service: PlatformNotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PlatformNotificationsService(
      mockPrisma as never,
      mockRealtime as unknown as PlatformNotificationsRealtimeService
    );
  });

  it("returns unread count", async () => {
    mockPrisma.platformNotification.count.mockResolvedValue(3);
    await expect(service.unreadCount("user-1")).resolves.toEqual({ count: 3 });
  });

  it("creates in-app notification and publishes realtime event", async () => {
    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    mockPrisma.platformNotification.create.mockResolvedValue({
      id: "n1",
      type: PlatformNotificationType.TENANT_CREATED,
      title: "Tenant created",
      body: "Acme was provisioned.",
      metadata: { href: "/tenants/t1" },
      readAt: null,
      createdAt
    });
    mockPrisma.platformNotification.count.mockResolvedValue(1);

    const dto = await service.createInApp({
      platformUserId: "user-1",
      type: PlatformNotificationType.TENANT_CREATED,
      title: "Tenant created",
      body: "Acme was provisioned.",
      metadata: { href: "/tenants/t1" }
    });

    expect(dto.id).toBe("n1");
    expect(mockRealtime.publishNotificationCreated).toHaveBeenCalledWith("user-1", {
      notification: expect.objectContaining({ id: "n1" }),
      unreadCount: 1
    });
  });
});
