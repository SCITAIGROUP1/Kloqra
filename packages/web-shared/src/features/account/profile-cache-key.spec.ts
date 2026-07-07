import { describe, expect, it } from "vitest";
import { profileApiOptions, resolveProfileCacheKey } from "./profile-cache-key";

describe("profile cache key", () => {
  it("prefers workspace id when present", () => {
    expect(resolveProfileCacheKey({ workspaceId: "ws-1", tenantId: "tenant-1" })).toBe("ws-1");
  });

  it("falls back to tenant key during onboarding", () => {
    expect(resolveProfileCacheKey({ tenantId: "tenant-1" })).toBe("tenant:tenant-1");
  });

  it("omits workspace header for tenant-scoped profile requests", () => {
    expect(profileApiOptions("tenant:tenant-1")).toEqual({});
    expect(profileApiOptions("ws-1")).toEqual({ workspaceId: "ws-1" });
  });
});
