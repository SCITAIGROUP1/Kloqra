import { ErrorCodes } from "@kloqra/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { DomainException } from "../errors/domain.exception";
import { CommercialFeaturesGuard } from "./commercial-features.guard";

describe("CommercialFeaturesGuard", () => {
  const prev = process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;
  const guard = new CommercialFeaturesGuard();

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;
    } else {
      process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = prev;
    }
  });

  it("allows when enabled", () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "true";
    expect(guard.canActivate()).toBe(true);
  });

  it("rejects with COMMERCIAL_FEATURES_DISABLED when off", () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "false";
    expect(() => guard.canActivate()).toThrow(DomainException);
    try {
      guard.canActivate();
    } catch (e) {
      expect(e).toMatchObject({ code: ErrorCodes.COMMERCIAL_FEATURES_DISABLED });
    }
  });
});
