/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShellHeaderActions } from "./shell-header-actions";

vi.mock("../stores/session.store", () => ({
  useSessionStore: Object.assign(
    (selector: (state: { session: { user: { name: string } } }) => unknown) =>
      selector({ session: { user: { name: "Sarah Johnson" } } }),
    { getState: () => ({ session: { user: { name: "Sarah Johnson" } }, accessToken: null }) }
  ),
  getAccessToken: () => null,
  getWorkspaceId: () => null
}));

vi.mock("./theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Appearance</button>
}));

vi.mock("./notification-dropdown", () => ({
  NotificationDropdown: () => <button type="button">Notifications</button>
}));

describe("ShellHeaderActions", () => {
  it("renders shared app bar controls", () => {
    render(<ShellHeaderActions profileHref="/profile" settingsHref="/settings" />);

    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Appearance" })).toBeTruthy();
    expect(screen.getByLabelText("Settings").getAttribute("href")).toBe("/settings");
    expect(screen.getByTitle("Sarah Johnson").getAttribute("href")).toBe("/profile");
  });

  it("renders onboarding help menu when replay callbacks are provided", () => {
    render(
      <ShellHeaderActions
        profileHref="/profile"
        settingsHref="/settings"
        onShowOnboardingWizard={vi.fn()}
        onShowOnboardingTour={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Help menu" })).toBeTruthy();
  });

  it("renders help menu when assistant callback is provided", () => {
    render(
      <ShellHeaderActions
        profileHref="/profile"
        settingsHref="/settings"
        onOpenAssistant={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Help menu" })).toBeTruthy();
  });
});
