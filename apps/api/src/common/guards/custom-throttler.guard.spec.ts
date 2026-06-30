import { describe, expect, it } from "vitest";
import { shouldBypassThrottler } from "./custom-throttler.guard";

describe("shouldBypassThrottler", () => {
  it("bypasses throttling in non-production", () => {
    expect(shouldBypassThrottler({ NODE_ENV: "development" })).toBe(true);
    expect(shouldBypassThrottler({ NODE_ENV: "test" })).toBe(true);
  });

  it("bypasses throttling when E2E_DISABLE_THROTTLE is set", () => {
    expect(shouldBypassThrottler({ NODE_ENV: "production", E2E_DISABLE_THROTTLE: "1" })).toBe(true);
  });

  it("enforces throttling in production by default", () => {
    expect(shouldBypassThrottler({ NODE_ENV: "production" })).toBe(false);
  });
});
