"use client";

import { SpotlightTour } from "@kloqra/ui";
import { markTourDone } from "./onboarding-storage";
import { ONBOARDING_TOUR_STEPS } from "./onboarding-tour-steps";

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
  const handleFinish = () => {
    if (!replay) {
      markTourDone();
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
