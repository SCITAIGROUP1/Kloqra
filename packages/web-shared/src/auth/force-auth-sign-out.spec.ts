/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClear = vi.fn();
const mockCancelRefresh = vi.fn();
const mockCancelProactive = vi.fn();
const mockDisconnectSocket = vi.fn();

vi.mock("../stores/session.store", () => ({
  useSessionStore: {
    getState: () => ({ clear: mockClear })
  }
}));

vi.mock("./auth-refresh-guard", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    cancelAuthRefreshRetries: () => mockCancelRefresh()
  };
});

vi.mock("./token-scheduler", () => ({
  cancelProactiveRefresh: () => mockCancelProactive()
}));

vi.mock("../realtime/notification-socket-manager", () => ({
  forceDisconnectNotificationSocket: () => mockDisconnectSocket()
}));

describe("forceTenantAuthSignOut", () => {
  beforeEach(() => {
    vi.resetModules();
    mockClear.mockReset();
    mockCancelRefresh.mockReset();
    mockCancelProactive.mockReset();
    mockDisconnectSocket.mockReset();
    window.history.pushState({}, "", "/dashboard");
  });

  it("clears session, stops refresh timers, and disconnects sockets", async () => {
    const { forceTenantAuthSignOut } = await import("./force-auth-sign-out");
    forceTenantAuthSignOut({ redirect: false });
    expect(mockCancelProactive).toHaveBeenCalled();
    expect(mockCancelRefresh).toHaveBeenCalled();
    expect(mockDisconnectSocket).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalledWith({ boundaryReason: "auth_failure" });
  });
});
