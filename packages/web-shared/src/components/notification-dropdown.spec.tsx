/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDropdown } from "./notification-dropdown";

const mockRefresh = vi.fn();
const mockRefreshUnread = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockPush = vi.fn();

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
        createdAt: new Date().toISOString(),
        metadata: { href: "/approvals" }
      }
    ],
    refresh: mockRefresh,
    setItems: vi.fn()
  }),
  formatNotificationTimeAgo: () => "5 min ago",
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args)
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush })
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

  it("shows unread count on the bell badge", () => {
    render(<NotificationDropdown workspaceId="ws1" viewAllHref="/notifications" />);

    expect(screen.getByLabelText("2 unread")).toBeTruthy();
  });

  it("marks a notification read without navigating away", () => {
    render(<NotificationDropdown workspaceId="ws1" viewAllHref="/notifications" />);

    fireEvent.click(screen.getByLabelText("Notifications"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Timesheet Approved/i }));

    expect(mockMarkNotificationRead).toHaveBeenCalledWith("ws1", "n1", true);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
