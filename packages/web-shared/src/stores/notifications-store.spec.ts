import { describe, expect, it } from "vitest";
import { useNotificationsStore } from "./notifications-store.js";

describe("useNotificationsStore applyNotificationPush", () => {
  it("updates unread count and prepends to recent items", () => {
    const workspaceId = "22222222-2222-4222-8222-222222222222";
    useNotificationsStore.setState({
      unreadByWorkspace: { [workspaceId]: { count: 0, loading: false } },
      recentByWorkspace: {
        [`${workspaceId}:8`]: { items: [], loading: false, limit: 8 }
      },
      unreadRefCounts: {},
      recentRefCounts: {},
      unreadPollTimer: null,
      unreadPollWorkspaceId: null
    });

    useNotificationsStore.getState().applyNotificationPush({
      workspaceId,
      unreadCount: 1,
      notification: {
        id: "11111111-1111-4111-8111-111111111111",
        type: "TIMESHEET_APPROVED",
        title: "Approved",
        body: "Done",
        readAt: null,
        createdAt: "2026-06-21T12:00:00.000Z"
      }
    });

    expect(useNotificationsStore.getState().unreadByWorkspace[workspaceId]?.count).toBe(1);
    expect(
      useNotificationsStore.getState().recentByWorkspace[`${workspaceId}:8`]?.items
    ).toHaveLength(1);
  });
});
