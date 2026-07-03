import { afterEach, describe, expect, it } from "vitest";
import { memberClientOrigin } from "./client-origin.util";

describe("memberClientOrigin", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("prefers PUBLIC_CLIENT_URL when set", () => {
    process.env.PUBLIC_CLIENT_URL = "https://chrono-mint-client.vercel.app/";
    expect(memberClientOrigin()).toBe("https://chrono-mint-client.vercel.app");
  });

  it("handles comma-separated list in PUBLIC_CLIENT_URL", () => {
    process.env.PUBLIC_CLIENT_URL =
      "https://chrono-mint-client.vercel.app,https://chrono-mint-admin.vercel.app";
    expect(memberClientOrigin()).toBe("https://chrono-mint-client.vercel.app");
  });

  it("falls back to localhost:3000 when PUBLIC_CLIENT_URL is not set", () => {
    delete process.env.PUBLIC_CLIENT_URL;
    expect(memberClientOrigin()).toBe("http://localhost:3000");
  });
});
