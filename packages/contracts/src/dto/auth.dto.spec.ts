import { describe, expect, it } from "vitest";
import { PLAN_SLUGS } from "../plan-catalog";
import { signupSchema } from "./auth.dto";

describe("signupSchema", () => {
  it("accepts valid self-serve signup payload", () => {
    const result = signupSchema.safeParse({
      email: "owner@acme.com",
      password: "Password123!",
      name: "Jane Owner",
      organizationName: "Acme Corporation",
      planSlug: PLAN_SLUGS.STARTER
    });
    expect(result.success).toBe(true);
  });

  it("rejects pilot plan slug", () => {
    const result = signupSchema.safeParse({
      email: "owner@acme.com",
      password: "Password123!",
      name: "Jane Owner",
      organizationName: "Acme Corporation",
      planSlug: PLAN_SLUGS.PILOT
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password", () => {
    const result = signupSchema.safeParse({
      email: "owner@acme.com",
      password: "short",
      name: "Jane Owner",
      organizationName: "Acme Corporation",
      planSlug: PLAN_SLUGS.PRO
    });
    expect(result.success).toBe(false);
  });
});
