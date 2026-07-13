import { afterEach, describe, expect, it } from "vitest";
import { isClientCommercialFeaturesEnabled } from "./client-commercial-features.util";

describe("isClientCommercialFeaturesEnabled", () => {
  const prev = process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;
    } else {
      process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = prev;
    }
  });

  it("defaults to true when unset", () => {
    delete process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED;
    expect(isClientCommercialFeaturesEnabled()).toBe(true);
  });

  it("is true when env is true", () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "true";
    expect(isClientCommercialFeaturesEnabled()).toBe(true);
  });

  it("is false when env is false or 0", () => {
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "false";
    expect(isClientCommercialFeaturesEnabled()).toBe(false);
    process.env.CLIENT_COMMERCIAL_FEATURES_ENABLED = "0";
    expect(isClientCommercialFeaturesEnabled()).toBe(false);
  });
});
