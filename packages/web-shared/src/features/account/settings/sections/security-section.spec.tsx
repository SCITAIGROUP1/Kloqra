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
  workContext: {
    organizationName: "Acme Corporation",
    workspaceName: "Acme Corporation",
    workspaceRole: "MEMBER"
  },
  activityStats: { totalHours: 0, projectCount: 0, memberSince: "2025-01-01T00:00:00.000Z" }
};

vi.mock("../../change-password-modal", () => ({
  ChangePasswordModal: () => <div>Change password form</div>
}));

vi.mock("react-qr-code", () => ({
  default: () => <div data-testid="qr-code" />
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe("SecuritySection 2FA setup", () => {
  it("shows QR code and secret after enabling 2FA", async () => {
    const onEnable2fa = vi.fn().mockResolvedValue({
      secret: "7Y0SPZ2AWUGXRUVVZBSHBSKB5HPBNY7G",
      otpauthUrl:
        "otpauth://totp/Kloqra:user@example.com?secret=7Y0SPZ2AWUGXRUVVZBSHBSKB5HPBNY7G&issuer=Kloqra"
    });

    render(
      <SecuritySection
        profile={profile}
        onChangePassword={vi.fn()}
        onEnable2fa={onEnable2fa}
        onVerify2fa={vi.fn()}
        onDisable2fa={vi.fn()}
        onListSessions={vi.fn()}
        onRevokeSession={vi.fn()}
        onRevokeOtherSessions={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Enable" }));
    expect(await screen.findByTestId("qr-code")).toBeTruthy();
    expect(screen.getByText("7Y0S PZ2A WUGX RUVV ZBSH BSKB 5HPB NY7G")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify and enable" })).toBeTruthy();
    expect(onEnable2fa).toHaveBeenCalledOnce();
  });
});

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
