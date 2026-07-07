/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSetSession = vi.fn();
const mockGetAccessToken = vi.fn();
const mockGetRefreshToken = vi.fn();
const mockSchedule = vi.fn();
const mockGetState = vi.fn();

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => mockGetAccessToken(),
  getRefreshToken: () => mockGetRefreshToken(),
  useSessionStore: {
    getState: () => mockGetState()
  }
}));

vi.mock("../api/base", () => ({
  getApiBase: () => "http://localhost:3001"
}));

vi.mock("./token-scheduler", () => ({
  configureProactiveRefresh: vi.fn(),
  scheduleProactiveRefresh: (...args: unknown[]) => mockSchedule(...args)
}));

vi.mock("./jwt-payload", () => ({
  isAccessTokenExpired: (token: string | null) => token === "expired-token",
  readUserIdFromToken: () => null
}));

const mockForceSignOut = vi.fn();

vi.mock("./force-auth-sign-out", () => ({
  forceTenantAuthSignOut: (...args: unknown[]) => mockForceSignOut(...args)
}));

describe("bootstrapTokenSchedulerFromStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAccessToken.mockReset();
    mockGetRefreshToken.mockReset();
    mockSetSession.mockReset();
    mockSchedule.mockReset();
    mockGetState.mockReset();
    mockForceSignOut.mockReset();
    mockGetRefreshToken.mockReturnValue("stored-refresh-token");
    mockGetState.mockReturnValue({
      accessToken: mockGetAccessToken(),
      session: null,
      setSession: mockSetSession
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "fresh-token",
          workspaceId: "ws-1",
          user: { id: "user-1" },
          tenantId: "t1"
        })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("schedules proactive refresh for a valid stored token on load", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    const { bootstrapTokenSchedulerFromStorage } = await import("./refresh-session");
    bootstrapTokenSchedulerFromStorage();
    expect(mockSchedule).toHaveBeenCalledWith("valid-token");
  });

  it("attempts refresh immediately when stored token is expired", async () => {
    mockGetAccessToken.mockReturnValue("expired-token");
    mockGetState.mockReturnValue({
      accessToken: "expired-token",
      session: null,
      setSession: mockSetSession
    });
    const { bootstrapTokenSchedulerFromStorage } = await import("./refresh-session");
    bootstrapTokenSchedulerFromStorage();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3001/auth/refresh",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ refreshToken: "stored-refresh-token" })
        })
      );
      expect(mockSetSession).toHaveBeenCalled();
    });
  });

  it("adopts refresh when another user signed in on a shared tab", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    mockGetState.mockReturnValue({
      accessToken: "valid-token",
      session: { user: { id: "user-b" }, tenantId: "tenant-b" },
      setSession: mockSetSession
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "fresh-token",
          user: { id: "user-a" },
          tenantId: "tenant-a"
        })
      })
    );

    const { tryRefreshSession } = await import("./refresh-session");
    const token = await tryRefreshSession();
    expect(token).toBe("fresh-token");
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: "user-a" } }),
      "fresh-token",
      undefined,
      { boundaryReason: "peer_sync" }
    );
  });

  it("drops stale refresh results after invalidateAuthRefresh", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    mockGetState.mockReturnValue({
      accessToken: "valid-token",
      session: { user: { id: "user-a" }, tenantId: "tenant-a" },
      setSession: mockSetSession
    });
    let resolveFetch: (value: unknown) => void = () => undefined;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        fetchPromise.then(() => ({
          ok: true,
          json: async () => ({
            accessToken: "fresh-token",
            user: { id: "user-a" },
            tenantId: "tenant-a"
          })
        }))
      )
    );

    const { tryRefreshSession, invalidateAuthRefresh } = await import("./refresh-session");
    const pending = tryRefreshSession();
    invalidateAuthRefresh();
    resolveFetch(undefined);
    const token = await pending;
    expect(token).toBeNull();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it("signs out when refresh returns unauthorized", async () => {
    mockGetAccessToken.mockReturnValue("valid-token");
    mockGetState.mockReturnValue({
      accessToken: "valid-token",
      session: { user: { id: "user-a" }, tenantId: "tenant-a" },
      setSession: mockSetSession
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ details: { reason: "session_revoked" } })
      })
    );

    const { tryRefreshSession } = await import("./refresh-session");
    const token = await tryRefreshSession();
    expect(token).toBeNull();
    expect(mockForceSignOut).toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
