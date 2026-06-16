/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPage } from "./notifications-page";

beforeEach(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

vi.mock("../../hooks/use-notifications", () => ({
  useNotificationUnreadCount: () => ({ count: 1, refresh: vi.fn() }),
  usePaginatedNotifications: () => ({
    items: [
      {
        id: "n1",
        workspaceId: "ws1",
        type: "TIMESHEET_STATUS",
        title: "Timesheet Approved",
        body: "Your timesheet for Week 23 has been approved",
        readAt: null,
        createdAt: new Date().toISOString(),
        metadata: { href: "/approvals" }
      }
    ],
    page: 1,
    setPage: vi.fn(),
    total: 1,
    totalPages: 1,
    limit: 25,
    setLimit: vi.fn(),
    loading: false,
    reload: vi.fn()
  }),
  formatNotificationTimeAgo: () => "5 min ago",
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn()
}));

describe("NotificationsPage", () => {
  it("does not auto-navigate when a notification has a related href", () => {
    render(<NotificationsPage workspaceId="ws1" />);

    expect(screen.getByText("Timesheet Approved")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Timesheet Approved/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark read" })).toBeTruthy();
  });
});
