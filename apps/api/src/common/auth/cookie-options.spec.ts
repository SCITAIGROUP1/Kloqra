import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isCrossSiteFrontendSetup,
  getCookieOpts,
  resolveAuthCookieSameSite,
  resolveAuthCookieSecure
} from "./cookie-options";

const originalEnv = process.env;

describe("cookie-options", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to lax in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.AUTH_COOKIE_SAME_SITE;
    expect(resolveAuthCookieSameSite()).toBe("lax");
  });

  it("uses none when explicitly set", () => {
    process.env.AUTH_COOKIE_SAME_SITE = "none";
    expect(resolveAuthCookieSameSite()).toBe("none");
    expect(resolveAuthCookieSecure("none")).toBe(true);
  });

  it("detects cross-site vercel + railway setup", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_ORIGIN =
      "https://kloqra-client.vercel.app,https://kloqra-admin.vercel.app";
    process.env.RAILWAY_PUBLIC_DOMAIN = "kloqra-api.up.railway.app";
    delete process.env.AUTH_COOKIE_SAME_SITE;
    expect(isCrossSiteFrontendSetup()).toBe(true);
    expect(resolveAuthCookieSameSite()).toBe("none");
  });

  it("sets partitioned cookies when sameSite is none", () => {
    process.env.AUTH_COOKIE_SAME_SITE = "none";
    expect(getCookieOpts()).toMatchObject({ sameSite: "none", partitioned: true, secure: true });
  });
});
