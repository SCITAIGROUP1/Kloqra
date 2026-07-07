/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClear = vi.fn();
const mockSetSession = vi.fn();
const mockGetAccessToken = vi.fn();

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => mockGetAccessToken(),
  useSessionStore: {
    getState: () => ({
      session: mockGetAccessToken() ? { user: { id: "user-a" }, tenantId: "t1" } : null,
      clear: mockClear,
      setSession: mockSetSession
    })
  }
}));

vi.mock("./auth-refresh-guard", () => ({
  invalidateAuthRefresh: vi.fn(),
  onAuthRefreshInvalidated: vi.fn(),
  getAuthRefreshGeneration: () => 0,
  isAuthRefreshStale: () => false
}));

vi.mock("./logout-session", () => ({
  invalidatePendingLogout: vi.fn()
}));

describe("establishTenantSession", () => {
  beforeEach(() => {
    mockClear.mockReset();
    mockSetSession.mockReset();
    mockGetAccessToken.mockReset();
  });

  it("clears an existing session before establishing a new one", async () => {
    mockGetAccessToken.mockReturnValue("old-token");
    const { establishTenantSession } = await import("./establish-tenant-session");
    establishTenantSession(
      { user: { id: "user-b" }, tenantId: "t1" } as never,
      "new-token",
      "refresh"
    );
    expect(mockClear).toHaveBeenCalledWith({ boundaryReason: "login" });
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: "user-b" } }),
      "new-token",
      "refresh",
      { boundaryReason: "login" }
    );
  });

  it("skips clear when there is no prior session or token", async () => {
    mockGetAccessToken.mockReturnValue(null);
    const { establishTenantSession } = await import("./establish-tenant-session");
    establishTenantSession({ user: { id: "user-b" }, tenantId: "t1" } as never, "new-token");
    expect(mockClear).not.toHaveBeenCalled();
    expect(mockSetSession).toHaveBeenCalled();
  });
});
