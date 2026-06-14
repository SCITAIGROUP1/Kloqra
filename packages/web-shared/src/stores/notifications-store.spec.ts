/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNotificationsStore } from "./notifications-store";

const mockApi = vi.fn();

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

describe("useNotificationsStore", () => {
  afterEach(() => {
    useNotificationsStore.setState({
      unreadByWorkspace: {},
      recentByWorkspace: {},
      unreadRefCounts: {},
      recentRefCounts: {},
      unreadPollTimer: null,
      unreadPollWorkspaceId: null
    });
    vi.clearAllMocks();
  });

  it("shares unread count across multiple subscribers", async () => {
    mockApi.mockResolvedValue({ count: 5 });
    const unsubA = useNotificationsStore.getState().subscribeUnread("ws1");
    const unsubB = useNotificationsStore.getState().subscribeUnread("ws1");

    await vi.waitFor(() => {
      expect(useNotificationsStore.getState().unreadByWorkspace.ws1?.count).toBe(5);
    });
    expect(mockApi).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  it("fetches recent notifications once per workspace/limit", async () => {
    mockApi.mockResolvedValue({ items: [{ id: "n1" }] });
    const unsubA = useNotificationsStore.getState().subscribeRecent("ws1", 8);
    const unsubB = useNotificationsStore.getState().subscribeRecent("ws1", 8);

    await vi.waitFor(() => {
      expect(useNotificationsStore.getState().recentByWorkspace["ws1:8"]?.items).toHaveLength(1);
    });
    expect(mockApi).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  it("useNotificationUnreadCount hook reads store state", async () => {
    useNotificationsStore.setState({
      unreadByWorkspace: { ws1: { count: 2, loading: false } }
    });
    const { useNotificationUnreadCount } = await import("../hooks/use-notifications");
    const { result } = renderHook(() => useNotificationUnreadCount("ws1", true));
    expect(result.current.count).toBe(2);
  });
});
