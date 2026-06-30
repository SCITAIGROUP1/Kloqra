/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPage } from "./notifications-page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push })
}));

beforeEach(() => {
  push.mockReset();
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
        metadata: { href: "/submissions", ctaLabel: "View submission" }
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
  markNotificationRead: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("./notification-actions", () => ({
  activateNotification: vi.fn(async (_ws, _item, navigate) => {
    navigate?.("/submissions");
  })
}));

describe("NotificationsPage", () => {
  it("navigates when Open is clicked for a notification with href", async () => {
    render(<NotificationsPage workspaceId="ws1" />);

    expect(screen.getByText("Timesheet Approved")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View submission" }));
    expect(push).toHaveBeenCalledWith("/submissions");
  });
});
