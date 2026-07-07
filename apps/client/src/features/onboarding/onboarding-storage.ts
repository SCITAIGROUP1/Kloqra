"use client";

import {
  readScopedJSON,
  scopedStorageKey,
  useSessionStore,
  writeScopedJSON
} from "@kloqra/web-shared";

export const ONBOARDING_WIZARD_DONE_KEY = "onboarding_done";
export const ONBOARDING_TOUR_DONE_KEY = "onboarding_tour_done";
const LEGACY_WIZARD_KEY = "kloqra_onboarding_done";
const LEGACY_TOUR_KEY = "kloqra_onboarding_tour_done";

function wizardKey(userId: string): string {
  return scopedStorageKey(ONBOARDING_WIZARD_DONE_KEY, { userId });
}

function tourKey(userId: string): string {
  return scopedStorageKey(ONBOARDING_TOUR_DONE_KEY, { userId });
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true";
}

function readScopedFlag(scopedKey: string, legacyKey: string): boolean {
  const scoped = readScopedJSON<unknown>(scopedKey);
  if (isTruthyFlag(scoped)) return true;

  const legacy = localStorage.getItem(legacyKey);
  if (legacy === "true") {
    writeScopedJSON(scopedKey, true);
    localStorage.removeItem(legacyKey);
    return true;
  }
  return false;
}

export function isWizardDone(): boolean {
  if (typeof window === "undefined") return true;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) return localStorage.getItem(LEGACY_WIZARD_KEY) === "true";
  return readScopedFlag(wizardKey(userId), LEGACY_WIZARD_KEY);
}

export function isTourDone(): boolean {
  if (typeof window === "undefined") return true;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) return localStorage.getItem(LEGACY_TOUR_KEY) === "true";
  return readScopedFlag(tourKey(userId), LEGACY_TOUR_KEY);
}

export function markWizardDone(): void {
  if (typeof window === "undefined") return;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) {
    localStorage.setItem(LEGACY_WIZARD_KEY, "true");
    return;
  }
  writeScopedJSON(wizardKey(userId), true);
  localStorage.removeItem(LEGACY_WIZARD_KEY);
}

export function markTourDone(): void {
  if (typeof window === "undefined") return;
  const userId = useSessionStore.getState().session?.user?.id;
  if (!userId) {
    localStorage.setItem(LEGACY_TOUR_KEY, "true");
    return;
  }
  writeScopedJSON(tourKey(userId), true);
  localStorage.removeItem(LEGACY_TOUR_KEY);
}

/** Clear onboarding flags for the signed-in user (used by e2e and session boundary). */
export function clearOnboardingStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_WIZARD_KEY);
  localStorage.removeItem(LEGACY_TOUR_KEY);

  const userId = useSessionStore.getState().session?.user?.id;
  if (userId) {
    localStorage.removeItem(wizardKey(userId));
    localStorage.removeItem(tourKey(userId));
  }
}
