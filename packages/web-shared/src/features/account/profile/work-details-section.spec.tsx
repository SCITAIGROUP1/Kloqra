/** @vitest-environment jsdom */
import type { UserProfileDto } from "@kloqra/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkDetailsSection } from "./work-details-section";

const profile: UserProfileDto = {
  email: "member@kloqra.dev",
  name: "Sam Rivera",
  firstName: "Sam",
  lastName: "Rivera",
  phone: null,
  location: null,
  jobTitle: "Analyst",
  department: "Operations",
  workStartDate: null,
  preferences: {},
  effectiveTheme: "system",
  effectiveTimezone: "UTC",
  effectiveDateFormat: "MDY",
  effectiveTimeFormat: "12h",
  effectiveDailyTargetHours: 8,
  effectiveTimerStaleWarningHours: 8,
  twoFactorEnabled: false,
  workContext: {
    organizationName: "Acme Corporation",
    workspaceName: "Acme Corporation",
    workspaceRole: "MEMBER"
  },
  activityStats: { totalHours: 241, projectCount: 2, memberSince: "2026-06-01T00:00:00.000Z" }
};

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe("WorkDetailsSection", () => {
  it("shows organization details and work stats", () => {
    render(<WorkDetailsSection profile={profile} onSave={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Organization" })).toBeTruthy();
    expect(screen.getAllByText("Acme Corporation").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Member")).toBeTruthy();
    expect(screen.getByText("241h")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});
