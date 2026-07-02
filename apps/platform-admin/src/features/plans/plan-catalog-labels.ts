import type { PlanBillingMode } from "@kloqra/contracts";

export function planBillingModeLabel(mode: PlanBillingMode): string {
  return mode === "contact" ? "Contact sales" : "Self-serve upgrade";
}

export function planBillingModeDescription(mode: PlanBillingMode): string {
  if (mode === "contact") {
    return "Pricing card uses a Contact sales button (mailto or custom link). No checkout or instant upgrade.";
  }
  return "Tenants upgrade from billing with an instant plan change by default. Real Stripe Checkout when BILLING_STRIPE_CHECKOUT=true on the API.";
}

export const PLAN_SLUG_ORDER: Record<string, number> = {
  starter: 0,
  pro: 1,
  pilot: 2
};

export function sortPlansForDisplay<T extends { slug: string; sortOrder: number; name: string }>(
  plans: T[]
): T[] {
  return [...plans].sort((a, b) => {
    const orderA = PLAN_SLUG_ORDER[a.slug] ?? a.sortOrder;
    const orderB = PLAN_SLUG_ORDER[b.slug] ?? b.sortOrder;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}
