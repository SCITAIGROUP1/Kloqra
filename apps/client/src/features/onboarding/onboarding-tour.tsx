"use client";

import { SpotlightTour } from "@kloqra/ui";
import { ONBOARDING_TOUR_STEPS } from "./onboarding-tour-steps";
import { useOnboardingStatus } from "./use-onboarding-status";

type OnboardingTourProps = {
  open: boolean;
  replay?: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
};

export function OnboardingTour({
  open,
  replay = false,
  onOpenChange,
  onComplete
}: OnboardingTourProps) {
  const { markTourDone } = useOnboardingStatus();

  const handleFinish = () => {
    if (!replay) {
      void markTourDone();
    }
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <SpotlightTour
      steps={ONBOARDING_TOUR_STEPS}
      open={open}
      onComplete={handleFinish}
      onSkip={handleFinish}
    />
  );
}
