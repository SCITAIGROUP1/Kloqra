/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockClear = vi.fn();
const mockSetSession = vi.fn();
const mockGetAccessToken = vi.fn();
const mockApplyDefault = vi.fn();
const mockApi = vi.fn();

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => mockGetAccessToken(),
  useSessionStore: {
    getState: () => ({
      clear: mockClear,
      setSession: mockSetSession
    })
  }
}));

vi.mock("../api/base", () => ({
  getApiBase: () => "http://localhost:3001"
}));

vi.mock("./apply-default-workspace", () => ({
  applyDefaultWorkspaceIfNeeded: (...args: unknown[]) => mockApplyDefault(...args)
}));

vi.mock("./refresh-session", () => ({
  tryRefreshSession: vi.fn().mockResolvedValue(null)
}));

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

describe("bootstrapSession impersonation handoff", () => {
  beforeEach(() => {
    vi.resetModules();
    mockClear.mockReset();
    mockSetSession.mockReset();
    mockGetAccessToken.mockReset();
    mockApplyDefault.mockReset();
    mockApi.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "handoff-access",
          workspaceId: "ws-1",
          workspaceRole: "MEMBER",
          user: { id: "user-1", email: "sam@kloqra.dev", name: "Sam" }
        })
      })
    );
    mockApplyDefault.mockImplementation(async (session: unknown, token: string) => ({
      session,
      accessToken: token
    }));
    mockApi
      .mockResolvedValueOnce({
        workspaceId: "ws-1",
        workspaceRole: "MEMBER",
        user: { id: "user-1", email: "sam@kloqra.dev", name: "Sam", defaultHourlyRate: null }
      })
      .mockResolvedValueOnce([{ id: "ws-1", name: "Acme", role: "MEMBER" }]);
    process.env.NEXT_PUBLIC_AUTH_SCOPE = "client";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AUTH_SCOPE;
  });

  it("completes impersonation via handoff token and loads workspaces", async () => {
    const { bootstrapSession } = await import("./bootstrap-session");
    const result = await bootstrapSession({ handoffToken: "one-time-token" });

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3001${ROUTES.AUTH.IMPERSONATE_COMPLETE}`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-Auth-Scope": "client" }),
        body: JSON.stringify({ handoffToken: "one-time-token" })
      })
    );
    expect(mockClear).toHaveBeenCalled();
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "ws-1" }),
      "handoff-access"
    );
    expect(result).toEqual({
      ok: true,
      session: expect.objectContaining({ workspaceId: "ws-1" }),
      workspaces: [{ id: "ws-1", name: "Acme", role: "MEMBER" }]
    });
  });

  it("dedupes concurrent handoff completion for the same token", async () => {
    mockApi.mockImplementation(async (path: string) => {
      if (path === "/auth/me") {
        return {
          workspaceId: "ws-1",
          workspaceRole: "MEMBER",
          user: { id: "user-1", email: "sam@kloqra.dev", name: "Sam", defaultHourlyRate: null }
        };
      }
      return [{ id: "ws-1", name: "Acme", role: "MEMBER" }];
    });

    const { bootstrapSession } = await import("./bootstrap-session");
    const [first, second] = await Promise.all([
      bootstrapSession({ handoffToken: "one-time-token" }),
      bootstrapSession({ handoffToken: "one-time-token" })
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("returns ok false when handoff completion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({})
      })
    );
    const { bootstrapSession } = await import("./bootstrap-session");
    const result = await bootstrapSession({ handoffToken: "expired-token" });
    expect(result).toEqual({ ok: false });
  });
});
