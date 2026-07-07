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
});
