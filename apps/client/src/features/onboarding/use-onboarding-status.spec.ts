/** @vitest-environment jsdom */
import { isOnboardingWizardDone } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboardingStatus } from "./use-onboarding-status";

const mockUpdatePreferences = vi.fn();
const mockProfile = {
  preferences: {} as Record<string, unknown>
};

vi.mock("@kloqra/web-shared", () => ({
  useUserProfile: () => ({
    profile: mockProfile,
    loading: false,
    updatePreferences: mockUpdatePreferences
  })
}));

describe("useOnboardingStatus", () => {
  beforeEach(() => {
    mockUpdatePreferences.mockReset();
    mockProfile.preferences = {};
    localStorage.clear();
    mockUpdatePreferences.mockResolvedValue({
      ...mockProfile,
      preferences: { onboardingWizardDone: true }
    });
  });

  it("reports wizard incomplete until preferences are set", async () => {
    const { result } = renderHook(() => useOnboardingStatus());
    expect(result.current.wizardDone).toBe(false);
  });

  it("persists wizard completion via preferences API", async () => {
    const { result } = renderHook(() => useOnboardingStatus());

    await result.current.markWizardDone();

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboardingWizardDone: true });
  });

  it("migrates legacy localStorage flags to preferences", async () => {
    localStorage.setItem("kloqra_onboarding_done", "true");
    renderHook(() => useOnboardingStatus());

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ onboardingWizardDone: true });
    });
    expect(localStorage.getItem("kloqra_onboarding_done")).toBeNull();
  });

  it("reads wizard completion from profile preferences", async () => {
    mockProfile.preferences = { onboardingWizardDone: true };
    const { result } = renderHook(() => useOnboardingStatus());
    expect(result.current.wizardDone).toBe(true);
    expect(isOnboardingWizardDone(mockProfile.preferences)).toBe(true);
  });
});
