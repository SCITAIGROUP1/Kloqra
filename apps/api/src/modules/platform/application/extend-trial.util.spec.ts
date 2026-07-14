import { describe, expect, it } from "vitest";
import {
  assertTrialEndsAtAllowed,
  computeExtendedTrialEndsAt,
  TRIAL_EXTEND_MAX_ABSOLUTE_DAYS
} from "./extend-trial.util";

describe("computeExtendedTrialEndsAt", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");

  it("extends from current end when trial is still active", () => {
    const current = new Date("2026-07-20T12:00:00.000Z");
    const result = computeExtendedTrialEndsAt(now, current, 7);
    expect(result.toISOString()).toBe("2026-07-27T12:00:00.000Z");
  });

  it("extends from now when trial already expired", () => {
    const current = new Date("2026-07-01T12:00:00.000Z");
    const result = computeExtendedTrialEndsAt(now, current, 14);
    expect(result.toISOString()).toBe("2026-07-28T12:00:00.000Z");
  });

  it("extends from now when trialEndsAt is null", () => {
    const result = computeExtendedTrialEndsAt(now, null, 30);
    expect(result.toISOString()).toBe("2026-08-13T12:00:00.000Z");
  });
});

describe("assertTrialEndsAtAllowed", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");

  it("accepts a future date within the window", () => {
    expect(() => assertTrialEndsAtAllowed(now, new Date("2026-08-01T12:00:00.000Z"))).not.toThrow();
  });

  it("rejects past or equal-to-now dates", () => {
    expect(() => assertTrialEndsAtAllowed(now, now)).toThrow(/future/);
    expect(() => assertTrialEndsAtAllowed(now, new Date("2026-07-14T11:00:00.000Z"))).toThrow(
      /future/
    );
  });

  it("rejects dates beyond the max absolute window", () => {
    const tooFar = new Date(now);
    tooFar.setDate(tooFar.getDate() + TRIAL_EXTEND_MAX_ABSOLUTE_DAYS + 1);
    expect(() => assertTrialEndsAtAllowed(now, tooFar)).toThrow(/within/);
  });
});
