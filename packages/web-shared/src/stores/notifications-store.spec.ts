import { describe, expect, it } from "vitest";
import { notificationRecentKey, notificationUnreadKey } from "./notification-cache-key";
import { useNotificationsStore } from "./notifications-store.js";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "33333333-3333-4333-8333-333333333333";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";

describe("useNotificationsStore applyNotificationPush", () => {
  it("updates unread count and prepends to recent items", () => {
    const unreadKey = notificationUnreadKey(USER_A, WORKSPACE_ID);
    const recentKey = notificationRecentKey(USER_A, WORKSPACE_ID, 8);
    useNotificationsStore.setState({
      unreadByWorkspace: { [unreadKey]: { count: 0, loading: false } },
      recentByWorkspace: {
        [recentKey]: { items: [], loading: false, limit: 8 }
      },
      unreadRefCounts: {},
      recentRefCounts: {},
      unreadPollTimer: null,
      unreadPollWorkspaceId: null,
      socketConnected: false
    });

    localStorage.setItem(
      "cm-app-access-token",
      [
        btoa(JSON.stringify({ alg: "none", typ: "JWT" })),
        btoa(JSON.stringify({ sub: USER_A, exp: Math.floor(Date.now() / 1000) + 3600 })),
        "sig"
      ].join(".")
    );

    useNotificationsStore.getState().applyNotificationPush({
      workspaceId: WORKSPACE_ID,
      unreadCount: 1,
      notification: {
        id: "44444444-4444-4444-8444-444444444444",
        type: "TIMESHEET_APPROVED",
        title: "Approved",
        body: "Done",
        readAt: null,
        createdAt: "2026-06-21T12:00:00.000Z"
      }
    });

    expect(useNotificationsStore.getState().unreadByWorkspace[unreadKey]?.count).toBe(1);
    expect(useNotificationsStore.getState().recentByWorkspace[recentKey]?.items).toHaveLength(1);
    localStorage.clear();
  });

  it("keeps separate caches per user in the same workspace", () => {
    const userAUnread = notificationUnreadKey(USER_A, WORKSPACE_ID);
    const userBUnread = notificationUnreadKey(USER_B, WORKSPACE_ID);
    useNotificationsStore.setState({
      unreadByWorkspace: {
        [userAUnread]: { count: 2, loading: false },
        [userBUnread]: { count: 5, loading: false }
      },
      recentByWorkspace: {},
      unreadRefCounts: {},
      recentRefCounts: {},
      unreadPollTimer: null,
      unreadPollWorkspaceId: null,
      socketConnected: false
    });

    useNotificationsStore.getState().removeWorkspace(WORKSPACE_ID);

    expect(useNotificationsStore.getState().unreadByWorkspace[userAUnread]).toBeUndefined();
    expect(useNotificationsStore.getState().unreadByWorkspace[userBUnread]).toBeUndefined();
  });
});
