import { describe, expect, it } from "vitest";
import { PLAN_SLUGS } from "../plan-catalog";
import { createSalesInquirySchema } from "./sales-inquiry.dto";

describe("createSalesInquirySchema", () => {
  it("accepts pilot plan slug with optional fields", () => {
    expect(
      createSalesInquirySchema.safeParse({
        planSlug: PLAN_SLUGS.PILOT,
        message: "Need enterprise for 80 seats",
        billingInterval: "yearly"
      }).success
    ).toBe(true);
  });

  it("rejects starter and pro slugs", () => {
    expect(createSalesInquirySchema.safeParse({ planSlug: PLAN_SLUGS.STARTER }).success).toBe(
      false
    );
    expect(createSalesInquirySchema.safeParse({ planSlug: PLAN_SLUGS.PRO }).success).toBe(false);
  });
});
