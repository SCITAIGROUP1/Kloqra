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

  it("keeps localhost defaults when only one PUBLIC_* URL is set outside production", () => {
    delete process.env.NODE_ENV;
    delete process.env.PUBLIC_CLIENT_URL;
    delete process.env.PUBLIC_PLATFORM_URL;
    process.env.PUBLIC_ADMIN_URL = "http://localhost:3002";

    expect(isAllowedBrowserOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedBrowserOrigin("http://localhost:3002")).toBe(true);
    expect(isAllowedBrowserOrigin("http://localhost:3003")).toBe(true);
  });

  it("does not fall back to localhost defaults in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.PUBLIC_CLIENT_URL;
    delete process.env.PUBLIC_PLATFORM_URL;
    process.env.PUBLIC_ADMIN_URL = "https://admin.example.com";

    expect(isAllowedBrowserOrigin("https://admin.example.com")).toBe(true);
    expect(isAllowedBrowserOrigin("http://localhost:3000")).toBe(false);
  });

  it("allows vercel preview origins", () => {
    expect(isAllowedBrowserOrigin("https://kloqra-client-staging.vercel.app")).toBe(true);
  });
});
