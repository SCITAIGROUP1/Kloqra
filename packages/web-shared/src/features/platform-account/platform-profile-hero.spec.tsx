/** @vitest-environment jsdom */
import type { PlatformUserProfileDto } from "@kloqra/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformProfileHero } from "./platform-profile-hero";

const baseProfile: PlatformUserProfileDto = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "platform@kloqra.dev",
  name: "Kloqra Platform Admin",
  platformRole: "SUPERADMIN",
  preferences: {},
  effectiveTheme: "system",
  twoFactorEnabled: false
};

describe("PlatformProfileHero", () => {
  it("renders identity details with a human-readable role", () => {
    render(<PlatformProfileHero profile={baseProfile} />);

    expect(screen.getByText("Kloqra Platform Admin")).toBeTruthy();
    expect(screen.getByText("platform@kloqra.dev")).toBeTruthy();
    expect(screen.getByText("Super Admin")).toBeTruthy();
    expect(screen.getByText("2FA not enabled")).toBeTruthy();
  });

  it("shows a protected badge when two-factor auth is enabled", () => {
    render(<PlatformProfileHero profile={{ ...baseProfile, twoFactorEnabled: true }} />);

    expect(screen.getByText("2FA enabled")).toBeTruthy();
  });
});
