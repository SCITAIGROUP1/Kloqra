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

  it("allows configured dedicated app URLs", () => {
    process.env.PUBLIC_CLIENT_URL = "https://client-only.example.com";
    process.env.PUBLIC_ADMIN_URL = "https://admin-only.example.com";
    process.env.PUBLIC_PLATFORM_URL = "https://platform-only.example.com";

    expect(isAllowedBrowserOrigin("https://client-only.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("https://admin-only.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("https://platform-only.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("https://evil.com")).toBe(false);
  });

  it("allows vercel preview origins", () => {
    expect(isAllowedBrowserOrigin("https://kloqra-client-staging.vercel.app")).toBe(true);
  });
});
