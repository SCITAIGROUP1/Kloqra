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

type AuthenticatedSocket = Socket & { data: { userId: string } };

@WebSocketGateway({
  namespace: "/helpdesk",
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedBrowserOrigin(origin));
    },
    credentials: true
  }
})
export class HelpdeskGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(HelpdeskGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtTokens: JwtTokenService,
    private authRevocation: AuthRevocationService,
    private redis: RedisService
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const auth = client.handshake.auth as { token?: string; scope?: string };
      const token = typeof auth.token === "string" ? auth.token.trim() : "";

      if (!token || auth.scope !== "platform") {
        throw new UnauthorizedException("Missing platform access token");
      }

      const payload = this.jwtTokens.verifyPlatformAccessToken(token);
      if (payload.family) {
        await this.authRevocation.assertNotRevoked(payload.platformUserId, payload.family);
      }

      client.data.userId = payload.platformUserId;
      await client.join("helpdesk_agents"); // Broadcast room for all agents
      this.logger.debug(`Agent ${client.data.userId} connected to helpdesk socket`);
    } catch (err) {
      this.logger.debug(
        `Helpdesk socket rejected: ${err instanceof Error ? err.message : String(err)}`
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) return;
    this.logger.debug(`Agent ${userId} disconnected from helpdesk socket`);
  }

  emitTicketCreated(ticket: any) {
    this.server.to("helpdesk_agents").emit("ticket_created", ticket);
  }

  emitTicketUpdated(ticket: any) {
    this.server.to("helpdesk_agents").emit("ticket_updated", ticket);
  }

  emitNewMessage(ticketId: string, message: any) {
    this.server.to("helpdesk_agents").emit("new_message", { ticketId, message });
  }
}
