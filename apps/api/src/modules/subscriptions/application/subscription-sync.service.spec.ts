import { type SubscriptionStatus } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { SubscriptionSyncService } from "./subscription-sync.service";

describe("SubscriptionSyncService", () => {
  const service = new SubscriptionSyncService({} as never, {} as never);

  it.each([
    ["trialing", "trial"],
    ["active", "active"],
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["canceled", "canceled"],
    ["paused", "suspended"]
  ] as const)("maps Stripe status %s to %s", (stripeStatus, expected) => {
    expect(service.mapStripeStatus(stripeStatus)).toBe(expected as SubscriptionStatus);
  });
});

describe("resolveBillingAlert", () => {
  it("returns past_due for past_due status", async () => {
    const { resolveBillingAlert } = await import("./billing-alert.util");
    expect(resolveBillingAlert({ status: "past_due", trialEndsAt: null })).toBe("past_due");
  });

  it("returns trial_ending within alert window", async () => {
    const { resolveBillingAlert } = await import("./billing-alert.util");
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);
    expect(resolveBillingAlert({ status: "trial", trialEndsAt })).toBe("trial_ending");
  });
});
