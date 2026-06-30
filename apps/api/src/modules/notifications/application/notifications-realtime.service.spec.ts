import { NOTIFICATION_CREATED_EVENT } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationUserChannel } from "./notifications-realtime.constants.js";
import { NotificationsRealtimeService } from "./notifications-realtime.service.js";

describe("NotificationsRealtimeService", () => {
  let service: NotificationsRealtimeService;
  let publish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    publish = vi.fn().mockResolvedValue(1);
    service = new NotificationsRealtimeService({
      getClient: () => ({ publish })
    } as never);
  });

  it("publishes notification.created on the user channel", async () => {
    const payload = {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      unreadCount: 1,
      notification: {
        id: "11111111-1111-4111-8111-111111111111",
        type: "TIMESHEET_APPROVED" as const,
        title: "Approved",
        body: "Done",
        readAt: null,
        createdAt: "2026-06-21T12:00:00.000Z"
      }
    };

    await service.publishNotificationCreated("user-1", payload);

    expect(publish).toHaveBeenCalledWith(
      notificationUserChannel("user-1"),
      JSON.stringify(payload)
    );
    expect(NOTIFICATION_CREATED_EVENT).toBe("notification.created");
  });
});
