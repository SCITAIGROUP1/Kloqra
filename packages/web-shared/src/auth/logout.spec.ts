/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApi = vi.fn();
const mockClear = vi.fn();
const mockGetRefreshToken = vi.fn();
const mockGetState = vi.fn();

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

vi.mock("../stores/session.store", () => ({
  getRefreshToken: () => mockGetRefreshToken(),
  useSessionStore: {
    getState: () => mockGetState()
  }
}));

vi.mock("../realtime/notification-socket-manager", () => ({
  forceDisconnectNotificationSocket: vi.fn()
}));

vi.mock("../hooks/theme-storage", () => ({
  clearStoredThemePreference: vi.fn()
}));

vi.mock("../stores/platform-user-profile.store", () => ({
  usePlatformUserProfileStore: {
    getState: () => ({ clear: vi.fn() })
  }
}));

vi.mock("../stores/platform-notifications-store", () => ({
  usePlatformNotificationsStore: {
    getState: () => ({ clear: vi.fn() })
  }
}));

describe("logoutSession", () => {
  beforeEach(() => {
    vi.resetModules();
    mockApi.mockReset();
    mockClear.mockReset();
    mockGetRefreshToken.mockReset();
    mockGetState.mockReturnValue({
      session: { user: { id: "user-a" }, workspaceId: "ws-1" },
      clear: mockClear
    });
    mockGetRefreshToken.mockReturnValue("refresh-a");
    mockApi.mockResolvedValue({ ok: true });
    vi.stubGlobal("location", { assign: vi.fn() });
  });

  it("clears local session before sending the logout request", async () => {
    const callOrder: string[] = [];
    mockClear.mockImplementation(() => {
      callOrder.push("clear");
    });
    mockApi.mockImplementation(async () => {
      callOrder.push("api");
      return { ok: true };
    });

    const { logoutSession } = await import("./logout");
    await logoutSession("ws-1");

    expect(callOrder).toEqual(["clear", "api"]);
    expect(mockApi).toHaveBeenCalledWith(
      ROUTES.AUTH.LOGOUT,
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ refreshToken: "refresh-a" }),
        workspaceId: "ws-1"
      })
    );
    expect(window.location.assign).toHaveBeenCalledWith("/login");
  });

  it("awaits logout API before navigating so refresh cannot revive the session", async () => {
    let resolveApi: (() => void) | undefined;
    mockApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveApi = () => resolve({ ok: true });
        })
    );

    const { logoutSession } = await import("./logout");
    const pending = logoutSession("ws-1");

    expect(window.location.assign).not.toHaveBeenCalled();
    resolveApi?.();
    await pending;
    expect(window.location.assign).toHaveBeenCalledWith("/login");
  });
});
