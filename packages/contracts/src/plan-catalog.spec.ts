import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_LIMITS,
  PLAN_SLUGS,
  planLimitExceededDetailsSchema,
  planSchema,
  resolveEffectiveLimits
} from "./plan-catalog";

describe("planSchema", () => {
  it("accepts catalog plan shape", () => {
    const result = planSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Pilot",
      slug: PLAN_SLUGS.PILOT,
      limits: DEFAULT_PLAN_LIMITS.pilot,
      isPublic: false
    });
    expect(result.success).toBe(true);
  });
});

describe("resolveEffectiveLimits", () => {
  it("returns plan limits when no override", () => {
    expect(resolveEffectiveLimits(DEFAULT_PLAN_LIMITS.starter)).toEqual({
      maxWorkspaces: 3,
      maxSeats: 10,
      maxReportingApiKeys: 5
    });
  });

  it("merges override fields over plan limits", () => {
    expect(resolveEffectiveLimits(DEFAULT_PLAN_LIMITS.pro, { maxSeats: 200 })).toEqual({
      maxWorkspaces: 10,
      maxSeats: 200,
      maxReportingApiKeys: 25
    });
  });
});

describe("planLimitExceededDetailsSchema", () => {
  it("accepts limit exceeded details", () => {
    const result = planLimitExceededDetailsSchema.safeParse({
      limit: "maxWorkspaces",
      current: 3,
      max: 3
    });
    expect(result.success).toBe(true);
  });
});
