/** @vitest-environment jsdom */
import type { UserProfileDto } from "@kloqra/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SecuritySection } from "./security-section";

const profile: UserProfileDto = {
  email: "member@kloqra.dev",
  name: "Sam Rivera",
  firstName: "Sam",
  lastName: "Rivera",
  phone: null,
  location: null,
  jobTitle: null,
  department: null,
  workStartDate: null,
  defaultHourlyRate: null,
  twoFactorEnabled: false,
  preferences: {},
  effectiveTheme: "system",
  effectiveTimezone: "UTC",
  effectiveDateFormat: "MDY",
  effectiveTimeFormat: "12h",
  effectiveDailyTargetHours: 8,
  effectiveTimerStaleWarningHours: 8,
  activityStats: { totalHours: 0, projectCount: 0, memberSince: "2025-01-01T00:00:00.000Z" }
};

vi.mock("../../change-password-section", () => ({
  ChangePasswordSection: () => <div>Change password form</div>
}));

describe("SecuritySection sessions", () => {
  it("shows sign out other devices when other sessions exist", async () => {
    render(
      <SecuritySection
        profile={profile}
        onChangePassword={vi.fn()}
        onEnable2fa={vi.fn()}
        onVerify2fa={vi.fn()}
        onDisable2fa={vi.fn()}
        onListSessions={vi.fn().mockResolvedValue([
          {
            id: "current",
            userAgent: "Chrome",
            ipAddress: "127.0.0.1",
            lastUsedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            isCurrent: true
          },
          {
            id: "other",
            userAgent: "Safari",
            ipAddress: "127.0.0.1",
            lastUsedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            isCurrent: false
          }
        ])}
        onRevokeSession={vi.fn()}
        onRevokeOtherSessions={vi.fn().mockResolvedValue({ revoked: 1 })}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "View Sessions" }));
    expect(await screen.findByRole("button", { name: "Sign out other devices" })).toBeTruthy();
  });
});
