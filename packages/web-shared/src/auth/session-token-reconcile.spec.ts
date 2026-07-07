/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApplyPeer = vi.fn();
const mockForceSignOut = vi.fn();
const mockGetAccessToken = vi.fn();
const mockGetState = vi.fn();

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => mockGetAccessToken(),
  applySessionFromPeer: (...args: unknown[]) => mockApplyPeer(...args),
  useSessionStore: {
    getState: () => ({
      session: mockGetState().session
    })
  }
}));

vi.mock("./force-auth-sign-out", () => ({
  forceTenantAuthSignOut: (...args: unknown[]) => mockForceSignOut(...args)
}));

vi.mock("../api/base", () => ({
  getApiBase: () => "http://localhost:3001"
}));

vi.mock("./jwt-payload", () => ({
  readUserIdFromToken: (token: string | null) => (token === "token-user-a" ? "user-a" : null)
}));

describe("syncSessionFromStoredToken", () => {
  beforeEach(() => {
    vi.resetModules();
    mockApplyPeer.mockReset();
    mockForceSignOut.mockReset();
    mockGetAccessToken.mockReset();
    mockGetState.mockReset();
    process.env.NEXT_PUBLIC_AUTH_SCOPE = "admin";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: "user-a" },
          tenantId: "t1",
          workspaceId: "ws-1"
        })
      })
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_AUTH_SCOPE;
    vi.unstubAllGlobals();
  });

  it("fetches /auth/me when stored token user differs from session", async () => {
    mockGetAccessToken.mockReturnValue("token-user-a");
    mockGetState.mockReturnValue({
      session: { user: { id: "user-b" }, tenantId: "t1" }
    });

    const { syncSessionFromStoredToken } = await import("./session-token-reconcile");
    await expect(syncSessionFromStoredToken()).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001${ROUTES.AUTH.ME}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-user-a",
          "X-Auth-Scope": "admin"
        })
      })
    );
    expect(mockApplyPeer).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: "user-a" } }),
      "token-user-a"
    );
  });
});
