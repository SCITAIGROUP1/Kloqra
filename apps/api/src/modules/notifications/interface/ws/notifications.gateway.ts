import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATIONS_SOCKET_NAMESPACE,
  type NotificationCreatedEvent
} from "@kloqra/contracts";
import { Logger, UnauthorizedException } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { isAllowedBrowserOrigin } from "../../../../common/auth/allowed-origins";
import { AuthRevocationService } from "../../../../common/auth/auth-revocation.service";
import { JwtTokenService } from "../../../../common/auth/jwt-token.service";
import { RedisService } from "../../../../common/redis/redis.service";
import { notificationUserChannel } from "../../application/notifications-realtime.constants.js";

type RedisSubscriber = {
  on(event: string, handler: (...args: unknown[]) => void): void;
  subscribe(channel: string): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  quit(): Promise<void>;
};

type AuthenticatedSocket = Socket & { data: { userId: string } };

@WebSocketGateway({
  namespace: NOTIFICATIONS_SOCKET_NAMESPACE,
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedBrowserOrigin(origin));
    },
    credentials: true
  }
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);
  private userPools = new Map<
    string,
    {
      sub: RedisSubscriber;
      listenerCount: number;
    }
  >();

  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtTokens: JwtTokenService,
    private authRevocation: AuthRevocationService,
    private redis: RedisService
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const userId = await this.authenticate(client);
      client.data.userId = userId;
      await client.join(this.userRoom(userId));
      await this.ensureUserSubscription(userId);
    } catch (err) {
      this.logger.debug(
        `Notifications socket rejected: ${err instanceof Error ? err.message : String(err)}`
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) return;
    await this.releaseUserSubscription(userId);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private async authenticate(client: Socket): Promise<string> {
    const auth = client.handshake.auth as { token?: string; scope?: string };
    const token = typeof auth.token === "string" ? auth.token.trim() : "";
    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }
    if (this.jwtTokens.isTokenExpired(token)) {
      throw new UnauthorizedException("Access token expired");
    }

    const scope = auth.scope === "client" || auth.scope === "admin" ? auth.scope : undefined;
    const payload = this.jwtTokens.verifyAccessToken(token, scope);
    await this.authRevocation.assertNotRevoked(payload.sub, payload.family);
    return payload.sub;
  }

  private async ensureUserSubscription(userId: string): Promise<void> {
    const existing = this.userPools.get(userId);
    if (existing) {
      existing.listenerCount += 1;
      return;
    }

    const sub = this.redis.getClient().duplicate() as RedisSubscriber;
    const channel = notificationUserChannel(userId);

    sub.on("message", (...args: unknown[]) => {
      const raw = args[1];
      if (typeof raw !== "string") return;
      try {
        const payload = JSON.parse(raw) as NotificationCreatedEvent;
        this.server.to(this.userRoom(userId)).emit(NOTIFICATION_CREATED_EVENT, payload);
      } catch {
        // ignore malformed payloads
      }
    });

    await sub.subscribe(channel);
    this.userPools.set(userId, { sub, listenerCount: 1 });
  }

  private async releaseUserSubscription(userId: string): Promise<void> {
    const pool = this.userPools.get(userId);
    if (!pool) return;

    pool.listenerCount -= 1;
    if (pool.listenerCount > 0) return;

    this.userPools.delete(userId);
    try {
      await pool.sub.unsubscribe(notificationUserChannel(userId));
      await pool.sub.quit();
    } catch {
      // ignore
    }
  }
}
