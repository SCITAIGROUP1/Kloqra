import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isAllowedBrowserOrigin } from "./allowed-origins";

const originalEnv = process.env;

describe("allowed-origins", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows configured FRONTEND_ORIGIN entries", () => {
    process.env.FRONTEND_ORIGIN = "https://client.example.com,https://admin.example.com";
    expect(isAllowedBrowserOrigin("https://client.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("https://evil.com")).toBe(false);
  });

  it("allows vercel preview origins", () => {
    expect(isAllowedBrowserOrigin("https://kloqra-client-staging.vercel.app")).toBe(true);
  });
});
