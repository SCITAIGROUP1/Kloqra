import { afterEach, describe, expect, it } from "vitest";
import { memberClientOrigin } from "./client-origin.util";

describe("memberClientOrigin", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("prefers PUBLIC_CLIENT_URL when set", () => {
    process.env.PUBLIC_CLIENT_URL = "https://chrono-mint-client.vercel.app/";
    process.env.FRONTEND_ORIGIN =
      "https://chrono-mint-admin.vercel.app,https://chrono-mint-client.vercel.app";
    expect(memberClientOrigin()).toBe("https://chrono-mint-client.vercel.app");
  });

  it("picks non-admin origin from FRONTEND_ORIGIN", () => {
    delete process.env.PUBLIC_CLIENT_URL;
    process.env.FRONTEND_ORIGIN =
      "https://chrono-mint-admin.vercel.app,https://chrono-mint-client.vercel.app";
    expect(memberClientOrigin()).toBe("https://chrono-mint-client.vercel.app");
  });
});
