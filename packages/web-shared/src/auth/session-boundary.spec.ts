import { describe, expect, it, vi, beforeEach } from "vitest";
import { useUserProfileStore } from "../stores/user-profile.store";
import {
  applySessionBoundary,
  getSessionGeneration,
  resolveColdHydrationBoundaryLevel
} from "./session-boundary";

describe("session-boundary", () => {
  beforeEach(() => {
    useUserProfileStore.getState().clear();
    vi.resetModules();
  });

  it("increments session generation on full boundary", () => {
    const before = getSessionGeneration();
    applySessionBoundary({
      prev: {
        user: { id: "user-1", name: "A" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      },
      next: null,
      reason: "logout",
      level: "full"
    });
    expect(getSessionGeneration()).toBe(before + 1);
  });

  it("skips generation bump for cold hydration with unchanged identity", () => {
    const before = getSessionGeneration();
    const level = resolveColdHydrationBoundaryLevel(
      {
        user: { id: "user-1", name: "A" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "MEMBER"
      },
      makeToken({ sub: "user-1", workspaceId: "ws-1" })
    );
    expect(level).toBe("none");
    applySessionBoundary({
      prev: null,
      next: {
        user: { id: "user-1", name: "A" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "MEMBER"
      },
      reason: "session_update",
      level
    });
    expect(getSessionGeneration()).toBe(before);
  });

  it("clears profile store on full boundary", () => {
    useUserProfileStore.getState().setProfile("ws-1", {
      id: "user-1",
      email: "a@example.com",
      name: "A"
    } as never);
    applySessionBoundary({
      prev: {
        user: { id: "user-1", name: "A" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      },
      next: null,
      reason: "logout",
      level: "full"
    });
    expect(useUserProfileStore.getState().byWorkspace).toEqual({});
  });
});

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload })
  ).toString("base64url");
  return `${header}.${body}.sig`;
}
