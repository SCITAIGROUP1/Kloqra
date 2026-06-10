/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationDropdown } from "./notification-dropdown";

describe("NotificationDropdown", () => {
  it("opens the notifications panel", () => {
    render(<NotificationDropdown />);

    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(screen.getByRole("menu", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByText("Timesheet Approved")).toBeTruthy();
    expect(screen.getByText("Mark all read")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View all notifications" }).getAttribute("href")).toBe(
      "/settings?section=notifications"
    );
  });
});
