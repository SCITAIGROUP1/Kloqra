/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAccessToken = vi.fn();
const mockTryRefresh = vi.fn();

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => mockGetAccessToken(),
  useSessionStore: { getState: () => ({ clear: vi.fn() }) }
}));

vi.mock("../auth/jwt-payload", () => ({
  isAccessTokenExpired: (token: string | null) => token === "expired-token"
}));

vi.mock("../auth/refresh-session", () => ({
  tryRefreshSession: () => mockTryRefresh()
}));

vi.mock("../auth/workspace-context", () => ({
  isWorkspaceMismatchError: () => false,
  resolveApiWorkspaceId: () => "ws-1"
}));

vi.mock("../api/base", () => ({
  getApiBase: () => "http://localhost:3001"
}));

describe("api client auth refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAccessToken.mockReset();
    mockTryRefresh.mockReset();
    mockTryRefresh.mockResolvedValue("fresh-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        json: async () => ({ ok: true })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes before sending when the stored access token is expired", async () => {
    mockGetAccessToken.mockReturnValue("expired-token");
    const { api } = await import("./client");
    await api("/users/me", { workspaceId: "ws-1" });

    expect(mockTryRefresh).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-token"
        })
      })
    );
  });

  it("dedupes concurrent identical GET requests", async () => {
    mockGetAccessToken.mockReturnValue("fresh-token");
    const { api } = await import("./client");
    const p1 = api("/projects?page=1&limit=100", { workspaceId: "ws-1" });
    const p2 = api("/projects?page=1&limit=100", { workspaceId: "ws-1" });
    await Promise.all([p1, p2]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("normalizes validation errors into user-friendly field messages", async () => {
    mockGetAccessToken.mockReturnValue("fresh-token");
    const { api } = await import("./client");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => "application/json" },
        json: async () => ({
          message: "Validation failed",
          details: {
            fieldErrors: {
              email: ["Required"],
              password: ["String must contain at least 1 character(s)"]
            }
          }
        })
      })
    );

    let err: unknown;
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "", password: "" })
      });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe(
      "Validation failed — Email is required; Password is required"
    );
  });
});
