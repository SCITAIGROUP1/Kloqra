import {
  NOTIFICATION_CREATED_EVENT,
  NOTIFICATIONS_SOCKET_NAMESPACE,
  PLATFORM_NOTIFICATION_CREATED_EVENT,
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
import { platformNotificationUserChannel } from "../../../../common/notifications/platform-realtime.constants";
import { RedisService } from "../../../../common/redis/redis.service";
import { notificationUserChannel } from "../../application/notifications-realtime.constants.js";

type RedisSubscriber = {
  on(event: string, handler: (...args: unknown[]) => void): void;
  subscribe(channel: string): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  quit(): Promise<void>;
};

type AuthenticatedSocket = Socket & { data: { userId: string; isPlatform: boolean } };

type UserPool = {
  sub: RedisSubscriber;
  listenerCount: number;
  channel: string;
  eventName: string;
};

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
  private userPools = new Map<string, UserPool>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtTokens: JwtTokenService,
    private authRevocation: AuthRevocationService,
    private redis: RedisService
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const { userId, isPlatform } = await this.authenticate(client);
      client.data.userId = userId;
      client.data.isPlatform = isPlatform;
      await client.join(this.userRoom(userId));
      await this.ensureUserSubscription(userId, isPlatform);
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
    await this.releaseUserSubscription(userId, client.data.isPlatform === true);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private poolKey(userId: string, isPlatform: boolean): string {
    return isPlatform ? `platform:${userId}` : `tenant:${userId}`;
  }

  private async authenticate(client: Socket): Promise<{ userId: string; isPlatform: boolean }> {
    const auth = client.handshake.auth as { token?: string; scope?: string };
    const token = typeof auth.token === "string" ? auth.token.trim() : "";
    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }
    if (this.jwtTokens.isTokenExpired(token)) {
      throw new UnauthorizedException("Access token expired");
    }

    if (auth.scope === "platform") {
      const payload = this.jwtTokens.verifyPlatformAccessToken(token);
      if (payload.family) {
        await this.authRevocation.assertNotRevoked(payload.platformUserId, payload.family);
      }
      return { userId: payload.platformUserId, isPlatform: true };
    }

    const scope = auth.scope === "client" || auth.scope === "admin" ? auth.scope : undefined;
    const payload = this.jwtTokens.verifyAccessToken(token, scope);
    await this.authRevocation.assertNotRevoked(payload.sub, payload.family);
    return { userId: payload.sub, isPlatform: false };
  }

  private async ensureUserSubscription(userId: string, isPlatform: boolean): Promise<void> {
    const key = this.poolKey(userId, isPlatform);
    const existing = this.userPools.get(key);
    if (existing) {
      existing.listenerCount += 1;
      return;
    }

    const sub = this.redis.getClient().duplicate() as RedisSubscriber;
    const channel = isPlatform
      ? platformNotificationUserChannel(userId)
      : notificationUserChannel(userId);
    const eventName = isPlatform ? PLATFORM_NOTIFICATION_CREATED_EVENT : NOTIFICATION_CREATED_EVENT;

    sub.on("message", (...args: unknown[]) => {
      const raw = args[1];
      if (typeof raw !== "string") return;
      try {
        const payload = JSON.parse(raw) as NotificationCreatedEvent;
        this.server.to(this.userRoom(userId)).emit(eventName, payload);
      } catch {
        // ignore malformed payloads
      }
    });

    await sub.subscribe(channel);
    this.userPools.set(key, { sub, listenerCount: 1, channel, eventName });
  }

  private async releaseUserSubscription(userId: string, isPlatform: boolean): Promise<void> {
    const key = this.poolKey(userId, isPlatform);
    const pool = this.userPools.get(key);
    if (!pool) return;

    pool.listenerCount -= 1;
    if (pool.listenerCount > 0) return;

    this.userPools.delete(key);
    try {
      await pool.sub.unsubscribe(pool.channel);
      await pool.sub.quit();
    } catch {
      // ignore
    }
  }
}
