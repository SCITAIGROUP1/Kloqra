"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { OnboardingOverlay } from "./onboarding-overlay";
import { OnboardingTour } from "./onboarding-tour";

type OnboardingOpenOptions = {
  replay?: boolean;
  tourOnly?: boolean;
};

type OnboardingContextValue = {
  openOnboarding: (options?: OnboardingOpenOptions) => void;
  openTour: (options?: { replay?: boolean }) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [wizardOpen, setWizardOpen] = useState<boolean | undefined>(undefined);
  const [tourOpen, setTourOpen] = useState(false);
  const [replay, setReplay] = useState(false);
  const [pendingTour, setPendingTour] = useState(false);

  // Safely trigger the tour after the router completes navigation to /timer
  useEffect(() => {
    if (pendingTour && pathname === "/timer") {
      setPendingTour(false);
      const timer = setTimeout(() => {
        setTourOpen(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pendingTour, pathname]);

  const openTour = useCallback((options?: { replay?: boolean }) => {
    setReplay(Boolean(options?.replay));
    setTourOpen(true);
  }, []);

  const openOnboarding = useCallback((options?: OnboardingOpenOptions) => {
    setReplay(Boolean(options?.replay));
    if (options?.tourOnly) {
      setTourOpen(true);
      return;
    }
    setWizardOpen(true);
  }, []);

  const handleWizardComplete = useCallback(
    ({ startTour }: { startTour: boolean }) => {
      setWizardOpen(false); // explicit close — do not fall back to auto-open
      if (startTour) {
        setPendingTour(true);
        if (pathname !== "/timer") {
          router.push("/timer");
        }
      } else if (!replay) {
        router.push("/timer");
      }
    },
    [replay, router, pathname]
  );

  const handleTourComplete = useCallback(() => {
    setTourOpen(false);
    if (!replay) {
      router.push("/timer");
    }
  }, [replay, router]);

  const value = useMemo(() => ({ openOnboarding, openTour }), [openOnboarding, openTour]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <OnboardingOverlay
        forceOpen={wizardOpen}
        replay={replay}
        onOpenChange={setWizardOpen}
        onComplete={handleWizardComplete}
      />
      <OnboardingTour
        open={tourOpen}
        replay={replay}
        onOpenChange={setTourOpen}
        onComplete={handleTourComplete}
      />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
