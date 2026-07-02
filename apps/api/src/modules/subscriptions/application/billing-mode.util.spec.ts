import { afterEach, describe, expect, it } from "vitest";
import { isBillingSimulated, resolveBillingMode } from "./billing-mode.util";

describe("billing-mode.util", () => {
  const originalStripeCheckout = process.env.BILLING_STRIPE_CHECKOUT;
  const originalSimulate = process.env.BILLING_SIMULATE_CHECKOUT;
  const originalStripe = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    for (const [key, value] of [
      ["BILLING_STRIPE_CHECKOUT", originalStripeCheckout],
      ["BILLING_SIMULATE_CHECKOUT", originalSimulate],
      ["STRIPE_SECRET_KEY", originalStripe]
    ] as const) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("defaults to simulated when env is unset", () => {
    delete process.env.BILLING_STRIPE_CHECKOUT;
    delete process.env.BILLING_SIMULATE_CHECKOUT;
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(isBillingSimulated()).toBe(true);
    expect(resolveBillingMode()).toBe("simulated");
  });

  it("uses real Stripe only when BILLING_STRIPE_CHECKOUT=true", () => {
    process.env.BILLING_STRIPE_CHECKOUT = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(isBillingSimulated()).toBe(false);
    expect(resolveBillingMode()).toBe("stripe");
  });

  it("honors legacy BILLING_SIMULATE_CHECKOUT=false", () => {
    delete process.env.BILLING_STRIPE_CHECKOUT;
    process.env.BILLING_SIMULATE_CHECKOUT = "false";
    expect(isBillingSimulated()).toBe(false);
  });
});
