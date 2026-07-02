import type { BillingMode } from "@kloqra/contracts";

/**
 * Owner billing checkout behavior.
 * Default: simulated (instant plan change). Set BILLING_STRIPE_CHECKOUT=true for real Stripe.
 */
export function isBillingSimulated(): boolean {
  const stripeCheckout = process.env.BILLING_STRIPE_CHECKOUT?.trim().toLowerCase();
  if (stripeCheckout === "true") return false;

  const legacySimulate = process.env.BILLING_SIMULATE_CHECKOUT?.trim().toLowerCase();
  if (legacySimulate === "false") return false;
  if (legacySimulate === "true") return true;

  return true;
}

export function resolveBillingMode(): BillingMode {
  return isBillingSimulated() ? "simulated" : "stripe";
}
