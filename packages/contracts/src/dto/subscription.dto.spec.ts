import { describe, expect, it } from "vitest";
import {
  changeSubscriptionPlanSchema,
  checkoutSessionResponseSchema,
  createCheckoutSessionSchema,
  portalSessionResponseSchema
} from "./subscription.dto";

describe("changeSubscriptionPlanSchema", () => {
  it("accepts starter and pro plan slugs", () => {
    expect(changeSubscriptionPlanSchema.safeParse({ planSlug: "starter" }).success).toBe(true);
    expect(changeSubscriptionPlanSchema.safeParse({ planSlug: "pro" }).success).toBe(true);
    expect(changeSubscriptionPlanSchema.safeParse({ planSlug: "pilot" }).success).toBe(false);
  });
});

describe("createCheckoutSessionSchema", () => {
  it("accepts starter and pro plan slugs", () => {
    expect(createCheckoutSessionSchema.safeParse({ planSlug: "starter" }).success).toBe(true);
    expect(createCheckoutSessionSchema.safeParse({ planSlug: "pro" }).success).toBe(true);
    expect(createCheckoutSessionSchema.safeParse({ planSlug: "pilot" }).success).toBe(false);
  });
});

describe("checkoutSessionResponseSchema", () => {
  it("accepts checkout url", () => {
    const result = checkoutSessionResponseSchema.safeParse({
      url: "https://checkout.stripe.com/c/pay/cs_test_123"
    });
    expect(result.success).toBe(true);
  });
});

describe("portalSessionResponseSchema", () => {
  it("accepts portal url", () => {
    const result = portalSessionResponseSchema.safeParse({
      url: "https://billing.stripe.com/p/session/test_123"
    });
    expect(result.success).toBe(true);
  });
});
