export const ONBOARDING_WIZARD_DONE_KEY = "kloqra_onboarding_done";
export const ONBOARDING_TOUR_DONE_KEY = "kloqra_onboarding_tour_done";

export function isWizardDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_WIZARD_DONE_KEY) === "true";
}

export function markWizardDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_WIZARD_DONE_KEY, "true");
}

export function markTourDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_TOUR_DONE_KEY, "true");
}
