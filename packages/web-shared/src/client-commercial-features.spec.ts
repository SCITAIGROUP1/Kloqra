import { afterEach, describe, expect, it, vi } from "vitest";
import { isClientCommercialFeaturesEnabled } from "./client-commercial-features";

describe("isClientCommercialFeaturesEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES", undefined);
    expect(isClientCommercialFeaturesEnabled()).toBe(true);
  });

  it("is false when env is false", () => {
    vi.stubEnv("NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES", "false");
    expect(isClientCommercialFeaturesEnabled()).toBe(false);
  });
});
