/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDropdown } from "./notification-dropdown";

const mockRefresh = vi.fn();
const mockRefreshUnread = vi.fn();

vi.mock("../hooks/use-notifications", () => ({
  useNotificationUnreadCount: () => ({ count: 2, refresh: mockRefreshUnread }),
  useRecentNotifications: () => ({
    items: [
      {
        id: "n1",
        workspaceId: "ws1",
        type: "TIMESHEET_STATUS",
        title: "Timesheet Approved",
        body: "Your timesheet for Week 23 has been approved",
        readAt: null,
        createdAt: new Date().toISOString()
      }
    ],
    refresh: mockRefresh,
    setItems: vi.fn()
  }),
  formatNotificationTimeAgo: () => "5 min ago",
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe("NotificationDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the notifications panel", () => {
    render(<NotificationDropdown workspaceId="ws1" viewAllHref="/notifications" />);

    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(screen.getByRole("menu", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByText("Timesheet Approved")).toBeTruthy();
    expect(screen.getByText("Mark all read")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View all notifications" }).getAttribute("href")).toBe(
      "/notifications"
    );
  });
});
