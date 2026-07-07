/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forceDisconnectNotificationSocket,
  getNotificationSocketConnectionState,
  subscribeNotificationConnection
} from "./notification-socket-manager";

const mockDisconnect = vi.fn();
const mockOn = vi.fn();
const mockIo = vi.fn(() => ({
  on: mockOn,
  removeAllListeners: vi.fn(),
  disconnect: mockDisconnect,
  connected: false
}));

vi.mock("socket.io-client", () => ({
  io: () => mockIo()
}));

vi.mock("../api/base", () => ({
  getApiBase: () => "http://localhost:3001"
}));

vi.mock("../stores/session.store", () => ({
  getAccessToken: () => "token-abc"
}));

vi.mock("../auth/auth-channel", () => ({
  subscribeSessionUpdates: (
    onUpdate: (session: unknown, token: string) => void,
    onClear?: () => void
  ) => {
    (globalThis as { __socketOnClear?: () => void }).__socketOnClear = onClear;
    return () => undefined;
  }
}));

describe("notification socket manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    forceDisconnectNotificationSocket();
  });

  it("forces idle state on logout disconnect", () => {
    expect(getNotificationSocketConnectionState()).toBe("idle");
    forceDisconnectNotificationSocket();
    expect(getNotificationSocketConnectionState()).toBe("idle");
  });

  it("notifies connection subscribers with current state", () => {
    const states: string[] = [];
    const unsub = subscribeNotificationConnection((state) => states.push(state));
    expect(states).toEqual(["idle"]);
    unsub();
  });

  it("disconnects when auth channel reports session cleared", async () => {
    const { connectNotificationSocket } = await import("./notification-socket-manager");
    connectNotificationSocket();
    const onClear = (globalThis as { __socketOnClear?: () => void }).__socketOnClear;
    onClear?.();
    expect(getNotificationSocketConnectionState()).toBe("disconnected");
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("forwards workspace.data.stale to subscribers", async () => {
    const handlers: Record<string, (raw: unknown) => void> = {};
    mockOn.mockImplementation((event: string, cb: (raw: unknown) => void) => {
      handlers[event] = cb;
    });

    const { connectNotificationSocket, subscribeWorkspaceDataStale } =
      await import("./notification-socket-manager");
    const received: unknown[] = [];
    subscribeWorkspaceDataStale((payload) => received.push(payload));
    connectNotificationSocket();

    handlers["workspace.data.stale"]?.({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      scopes: ["timelogs", "timesheet"],
      actorUserId: "00000000-0000-4000-8000-000000000002"
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      scopes: ["timelogs", "timesheet"]
    });
  });
});
