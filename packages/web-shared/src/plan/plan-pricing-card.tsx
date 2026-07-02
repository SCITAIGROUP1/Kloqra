"use client";

import { Badge, Button, cn } from "@kloqra/ui";
import { CheckCircle2, Sparkles } from "lucide-react";
import {
  isPaidCheckoutTier,
  resolveTierPriceDisplay,
  type BillingInterval,
  type PlanPricingTier
} from "./pricing-tier";

export type PlanPricingCardProps = {
  tier: PlanPricingTier;
  billingInterval?: BillingInterval;
  isCurrent?: boolean;
  checkoutLoading?: boolean;
  upgrading?: boolean;
  preview?: boolean;
  onUpgrade?: () => void;
  onContact?: () => void;
  testId?: string;
};

export function PlanPricingCard({
  tier,
  billingInterval = "monthly",
  isCurrent = false,
  checkoutLoading = false,
  upgrading = false,
  preview = false,
  onUpgrade,
  onContact,
  testId
}: PlanPricingCardProps) {
  const isCheckout = isPaidCheckoutTier(tier);
  const { price, suffix } = resolveTierPriceDisplay(tier, billingInterval);
  const showRecommended = tier.recommended && !isCurrent;

  function handleCtaClick() {
    if (preview || isCurrent) return;
    if (isCheckout) {
      onUpgrade?.();
      return;
    }
    if (onContact) {
      onContact();
      return;
    }
    if (tier.contactHref && !tier.contactHref.startsWith("mailto:")) {
      window.open(tier.contactHref, "_blank", "noopener,noreferrer");
    }
  }

  const ctaLabel = preview
    ? tier.ctaLabel
    : upgrading
      ? "Please wait…"
      : isCurrent
        ? "Current plan"
        : tier.ctaLabel;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
        showRecommended && "border-primary ring-1 ring-primary/20",
        isCurrent && "border-primary ring-2 ring-primary/25",
        preview && "pointer-events-none select-none"
      )}
      data-testid={
        isCurrent ? "billing-plan-card" : preview ? "plan-pricing-preview-card" : undefined
      }
      aria-hidden={preview || undefined}
    >
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="space-y-3">
          <div className="flex min-h-7 flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{tier.name}</h2>
            {isCurrent ? (
              <Badge variant="secondary" className="border-0 bg-primary/10 text-primary">
                Active
              </Badge>
            ) : null}
            {showRecommended ? (
              <Badge
                className="border-0 bg-primary text-primary-foreground"
                data-testid="plan-pricing-recommended-banner"
              >
                <Sparkles className="mr-1 size-3" aria-hidden />
                Recommended
              </Badge>
            ) : null}
          </div>

          <div className="flex h-10 items-baseline gap-1">
            {price ? (
              <>
                <span className="text-3xl font-semibold tabular-nums tracking-tight">{price}</span>
                <span className="text-sm text-muted-foreground">{suffix}</span>
              </>
            ) : (
              <span className="text-3xl font-semibold tracking-tight">Custom</span>
            )}
          </div>

          <p className="min-h-10 line-clamp-2 text-sm text-muted-foreground">{tier.tagline}</p>
        </div>

        <ul className="flex flex-1 flex-col justify-start space-y-2.5 border-t border-border/70 pt-5">
          {tier.features.map((feature) => (
            <li key={feature} className="flex min-h-5 items-start gap-2 text-sm leading-snug">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant={isCurrent ? "outline" : tier.recommended ? "default" : "secondary"}
          className={cn(
            "mt-auto w-full shrink-0",
            !isCurrent && !isCheckout && "bg-primary/5 text-primary hover:bg-primary/10",
            preview && "opacity-80"
          )}
          disabled={
            preview ||
            isCurrent ||
            (isCheckout && checkoutLoading) ||
            (!isCheckout && !isCurrent && !onContact && !tier.contactHref)
          }
          onClick={() => void handleCtaClick()}
          data-testid={testId}
          tabIndex={preview ? -1 : undefined}
        >
          {ctaLabel}
        </Button>
      </div>
    </article>
  );
}
