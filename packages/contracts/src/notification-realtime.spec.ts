import { describe, expect, it } from "vitest";
import {
  notificationCreatedEventSchema,
  NOTIFICATIONS_SOCKET_NAMESPACE,
  workspaceDataInvalidateScopeSchema
} from "./notification-realtime";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_WS = "22222222-2222-4222-8222-222222222222";

describe("notification-realtime", () => {
  it("exposes the notifications socket namespace", () => {
    expect(NOTIFICATIONS_SOCKET_NAMESPACE).toBe("/notifications");
  });

  it("includes tasks in workspace invalidate scopes", () => {
    expect(workspaceDataInvalidateScopeSchema.safeParse("tasks").success).toBe(true);
  });

  it("validates notification.created payloads", () => {
    const result = notificationCreatedEventSchema.safeParse({
      workspaceId: UUID_WS,
      unreadCount: 2,
      notification: {
        id: UUID,
        type: "TIMESHEET_APPROVED",
        title: "Timesheet approved",
        body: "Your timesheet was approved.",
        readAt: null,
        createdAt: "2026-06-21T12:00:00.000Z",
        metadata: { href: "/submissions" }
      }
    });
    expect(result.success).toBe(true);
  });
});
