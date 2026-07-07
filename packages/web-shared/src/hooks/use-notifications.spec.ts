/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notificationUnreadKey } from "../stores/notification-cache-key";
import { NOTIFICATIONS_UPDATED_EVENT, useNotificationUnreadCount } from "./use-notifications";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "ws1";
const CACHE_KEY = notificationUnreadKey(USER_ID, WORKSPACE_ID);

const mockRefreshUnread = vi.fn();
const mockSubscribeUnread = vi.fn(() => () => {});

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => "token",
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({ session: { user: { id: USER_ID } } })
}));

vi.mock("../auth/jwt-payload", () => ({
  readUserIdFromToken: () => USER_ID
}));

vi.mock("../stores/notifications-store", () => ({
  NOTIFICATIONS_UPDATED_EVENT: "kloqra:notifications-updated",
  useNotificationsStore: (selector: (state: unknown) => unknown) =>
    selector({
      unreadByWorkspace: { [CACHE_KEY]: { count: 3, loading: false } },
      subscribeUnread: mockSubscribeUnread,
      refreshUnread: mockRefreshUnread
    })
}));

describe("useNotificationUnreadCount", () => {
  beforeEach(() => {
    mockRefreshUnread.mockResolvedValue(undefined);
    mockSubscribeUnread.mockImplementation(() => () => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes once and exposes shared unread count", async () => {
    const { result } = renderHook(() => useNotificationUnreadCount(WORKSPACE_ID));

    await waitFor(() => expect(result.current.count).toBe(3));
    expect(mockSubscribeUnread).toHaveBeenCalledWith(USER_ID, WORKSPACE_ID);
    expect(result.current.aligned).toBe(true);
  });

  it("dispatches a shared update event name", () => {
    expect(NOTIFICATIONS_UPDATED_EVENT).toBe("kloqra:notifications-updated");
  });

  it("refresh delegates to the store", async () => {
    const { result } = renderHook(() => useNotificationUnreadCount(WORKSPACE_ID));
    await result.current.refresh();
    expect(mockRefreshUnread).toHaveBeenCalledWith(USER_ID, WORKSPACE_ID);
  });
});
