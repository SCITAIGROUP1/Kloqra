"use client";

import { cn } from "@kloqra/ui";
import type { OnboardingFeatureCardData } from "./onboarding-steps";

type OnboardingFeatureCardProps = {
  card: OnboardingFeatureCardData;
  className?: string;
};

export function OnboardingFeatureCard({ card, className }: OnboardingFeatureCardProps) {
  const Icon = card.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{card.title}</p>
          {card.route ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {card.route}
            </span>
          ) : null}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{card.description}</p>
    </div>
  );
}
