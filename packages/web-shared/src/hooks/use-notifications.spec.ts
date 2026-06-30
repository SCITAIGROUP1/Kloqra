/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATIONS_UPDATED_EVENT, useNotificationUnreadCount } from "./use-notifications";

const mockRefreshUnread = vi.fn();
const mockSubscribeUnread = vi.fn(() => () => {});

vi.mock("../stores/notifications-store", () => ({
  NOTIFICATIONS_UPDATED_EVENT: "kloqra:notifications-updated",
  useNotificationsStore: (selector: (state: unknown) => unknown) =>
    selector({
      unreadByWorkspace: { ws1: { count: 3, loading: false } },
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
    const { result } = renderHook(() => useNotificationUnreadCount("ws1"));

    await waitFor(() => expect(result.current.count).toBe(3));
    expect(mockSubscribeUnread).toHaveBeenCalledWith("ws1");
  });

  it("dispatches a shared update event name", () => {
    expect(NOTIFICATIONS_UPDATED_EVENT).toBe("kloqra:notifications-updated");
  });

  it("refresh delegates to the store", async () => {
    const { result } = renderHook(() => useNotificationUnreadCount("ws1"));
    await result.current.refresh();
    expect(mockRefreshUnread).toHaveBeenCalledWith("ws1");
  });
});
