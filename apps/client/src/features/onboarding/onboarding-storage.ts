/**
 * @deprecated Onboarding completion is stored in user preferences (DB).
 * Use `useOnboardingStatus()` instead.
 */
export {
  clearLegacyOnboardingStorage as clearOnboardingStorage,
  useOnboardingStatus
} from "./use-onboarding-status";
