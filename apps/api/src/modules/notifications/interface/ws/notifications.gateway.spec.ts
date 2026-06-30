import { NOTIFICATION_CREATED_EVENT } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsGateway } from "./notifications.gateway";

describe("NotificationsGateway", () => {
  let gateway: NotificationsGateway;
  let jwtTokens: {
    isTokenExpired: ReturnType<typeof vi.fn>;
    verifyAccessToken: ReturnType<typeof vi.fn>;
  };
  let authRevocation: { assertNotRevoked: ReturnType<typeof vi.fn> };
  let redisSub: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
  };
  let redis: { getClient: ReturnType<typeof vi.fn> };
  let server: { to: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtTokens = {
      isTokenExpired: vi.fn().mockReturnValue(false),
      verifyAccessToken: vi.fn().mockReturnValue({ sub: "user-1", family: "fam-1" })
    };
    authRevocation = { assertNotRevoked: vi.fn().mockResolvedValue(undefined) };
    redisSub = {
      on: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined)
    };
    redis = {
      getClient: vi.fn().mockReturnValue({ duplicate: vi.fn().mockReturnValue(redisSub) })
    };
    gateway = new NotificationsGateway(jwtTokens as never, authRevocation as never, redis as never);
    server = {
      to: vi.fn().mockReturnValue({ emit: vi.fn() })
    };
    gateway.server = server as never;
  });

  it("rejects connections without a token", async () => {
    const client = {
      handshake: { auth: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
      data: {}
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it("joins user room and subscribes to redis on valid token", async () => {
    const client = {
      handshake: { auth: { token: "valid-token", scope: "client" } },
      join: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      data: {} as { userId?: string }
    };

    await gateway.handleConnection(client as never);

    expect(jwtTokens.verifyAccessToken).toHaveBeenCalledWith("valid-token", "client");
    expect(client.join).toHaveBeenCalledWith("user:user-1");
    expect(redisSub.subscribe).toHaveBeenCalled();
  });

  it("forwards redis messages to socket room", async () => {
    const emit = vi.fn();
    server.to.mockReturnValue({ emit });

    const client = {
      handshake: { auth: { token: "valid-token" } },
      join: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      data: {} as { userId?: string }
    };
    await gateway.handleConnection(client as never);

    const messageHandler = redisSub.on.mock.calls.find(([event]) => event === "message")?.[1];
    expect(messageHandler).toBeTypeOf("function");

    const payload = {
      notification: {
        id: "00000000-0000-4000-8000-000000000001",
        type: "TIMESHEET_APPROVED",
        title: "Approved",
        body: "Done",
        readAt: null,
        createdAt: "2026-06-13T12:00:00.000Z"
      },
      workspaceId: "00000000-0000-4000-8000-000000000002",
      unreadCount: 1
    };
    messageHandler!("notifications:user:user-1", JSON.stringify(payload));

    expect(server.to).toHaveBeenCalledWith("user:user-1");
    expect(emit).toHaveBeenCalledWith(NOTIFICATION_CREATED_EVENT, payload);
  });

  it("disconnects when token is expired", async () => {
    jwtTokens.isTokenExpired.mockReturnValue(true);
    const client = {
      handshake: { auth: { token: "expired" } },
      join: vi.fn(),
      disconnect: vi.fn(),
      data: {}
    };

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(jwtTokens.verifyAccessToken).not.toHaveBeenCalled();
  });
});
