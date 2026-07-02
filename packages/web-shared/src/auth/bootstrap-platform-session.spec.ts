import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { bootstrapPlatformSession } from "./bootstrap-platform-session";

describe("bootstrapPlatformSession", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SCOPE", "platform");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("returns ok false when no token and refresh fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await bootstrapPlatformSession();
    expect(result.ok).toBe(false);
  });
});
