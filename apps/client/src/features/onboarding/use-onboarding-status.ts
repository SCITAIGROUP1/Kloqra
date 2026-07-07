"use client";

import {
  isOnboardingTourDone,
  isOnboardingWizardDone,
  type UserPreferences
} from "@kloqra/contracts";
import { useUserProfile } from "@kloqra/web-shared";
import { useCallback, useEffect, useRef } from "react";

const LEGACY_WIZARD_KEY = "kloqra_onboarding_done";
const LEGACY_TOUR_KEY = "kloqra_onboarding_tour_done";

function readLegacyWizardDone(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LEGACY_WIZARD_KEY) === "true";
}

function readLegacyTourDone(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LEGACY_TOUR_KEY) === "true";
}

function clearLegacyOnboardingKeys(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_WIZARD_KEY);
  localStorage.removeItem(LEGACY_TOUR_KEY);
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.endsWith(":onboarding_done") || key.endsWith(":onboarding_tour_done")) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

/** DB-backed onboarding flags for the signed-in user (via GET/PATCH /users/me/preferences). */
export function useOnboardingStatus() {
  const { profile, loading, updatePreferences } = useUserProfile();
  const migratedRef = useRef(false);

  const preferences = profile?.preferences ?? ({} as UserPreferences);
  const wizardDone = isOnboardingWizardDone(preferences) || readLegacyWizardDone();
  const tourDone = isOnboardingTourDone(preferences) || readLegacyTourDone();

  useEffect(() => {
    if (loading || !profile || migratedRef.current) return;

    const legacyWizard = readLegacyWizardDone();
    const legacyTour = readLegacyTourDone();
    if (!legacyWizard && !legacyTour) return;

    migratedRef.current = true;
    const patch: Partial<UserPreferences> = {};
    if (legacyWizard && !isOnboardingWizardDone(preferences)) {
      patch.onboardingWizardDone = true;
    }
    if (legacyTour && !isOnboardingTourDone(preferences)) {
      patch.onboardingTourDone = true;
    }
    clearLegacyOnboardingKeys();

    if (Object.keys(patch).length > 0) {
      void updatePreferences(patch);
    }
  }, [loading, profile, preferences, updatePreferences]);

  const markWizardDone = useCallback(async () => {
    clearLegacyOnboardingKeys();
    if (isOnboardingWizardDone(preferences)) return;
    await updatePreferences({ onboardingWizardDone: true });
  }, [preferences, updatePreferences]);

  const markTourDone = useCallback(async () => {
    clearLegacyOnboardingKeys();
    if (isOnboardingTourDone(preferences)) return;
    await updatePreferences({ onboardingTourDone: true });
  }, [preferences, updatePreferences]);

  const resetOnboarding = useCallback(async () => {
    clearLegacyOnboardingKeys();
    await updatePreferences({ onboardingWizardDone: false, onboardingTourDone: false });
  }, [updatePreferences]);

  return {
    profileLoading: loading,
    wizardDone,
    tourDone,
    markWizardDone,
    markTourDone,
    resetOnboarding
  };
}

/** Remove legacy browser keys only (e2e hygiene). Prefer resetOnboarding for state. */
export function clearLegacyOnboardingStorage(): void {
  clearLegacyOnboardingKeys();
}
