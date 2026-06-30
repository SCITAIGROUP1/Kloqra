import {
  assistantChatResponseSchema,
  type AssistantChatRequestDto,
  type AssistantChatResponseDto,
  type AssistantInternalChatRequestDto
} from "@kloqra/contracts";
import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "../../../common/redis/redis.service";
import { buildAssistantFallbackReply } from "./assistant-fallback";

const PROXY_TIMEOUT_MS = Number(process.env.ASSISTANT_PROXY_TIMEOUT_MS ?? 12_000);
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 60_000;

function isAssistantEnabled(): boolean {
  const raw = process.env.ASSISTANT_ENABLED;
  if (raw === undefined) return true;
  return raw.trim().toLowerCase() !== "false" && raw !== "0";
}

@Injectable()
export class AssistantProxyService {
  private readonly logger = new Logger(AssistantProxyService.name);
  private readonly FAILURE_KEY = "assistant:circuit:failures";
  private readonly OPEN_UNTIL_KEY = "assistant:circuit:open_until";

  constructor(private redis: RedisService) {}

  private get serviceUrl(): string {
    return (process.env.ASSISTANT_SERVICE_URL ?? "http://localhost:3003").replace(/\/$/, "");
  }

  private get internalSecret(): string | undefined {
    return process.env.ASSISTANT_INTERNAL_SECRET?.trim() || undefined;
  }

  private async isCircuitOpen(): Promise<boolean> {
    const openUntil = await this.redis.getClient().get(this.OPEN_UNTIL_KEY);
    return openUntil ? Date.now() < Number(openUntil) : false;
  }

  private async recordFailure(): Promise<void> {
    const count = await this.redis.getClient().incr(this.FAILURE_KEY);
    await this.redis.getClient().expire(this.FAILURE_KEY, 60); // 60s failure window
    if (count >= CIRCUIT_FAILURE_THRESHOLD) {
      await this.redis
        .getClient()
        .set(this.OPEN_UNTIL_KEY, String(Date.now() + CIRCUIT_OPEN_MS), "EX", 60);
      this.logger.warn("Assistant circuit breaker opened for 60s");
    }
  }

  private async recordSuccess(): Promise<void> {
    await this.redis.getClient().del(this.FAILURE_KEY);
    await this.redis.getClient().del(this.OPEN_UNTIL_KEY);
  }

  async chat(
    body: AssistantChatRequestDto,
    options: { userDisplayName?: string; requestId?: string }
  ): Promise<AssistantChatResponseDto> {
    if (!isAssistantEnabled()) {
      return buildAssistantFallbackReply();
    }

    if (await this.isCircuitOpen()) {
      this.logger.debug("Assistant circuit open — returning fallback");
      return buildAssistantFallbackReply();
    }

    const secret = this.internalSecret;
    if (!secret) {
      this.logger.debug("ASSISTANT_INTERNAL_SECRET not set — returning fallback");
      return buildAssistantFallbackReply();
    }

    const payload: AssistantInternalChatRequestDto = {
      ...body,
      userDisplayName: options.userDisplayName
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    try {
      const res = await fetch(`${this.serviceUrl}/internal/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Assistant-Secret": secret,
          ...(options.requestId ? { "x-request-id": options.requestId } : {})
        },
        body: JSON.stringify({
          messages: payload.messages,
          user_display_name: payload.userDisplayName
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        this.logger.warn(`Assistant service responded ${res.status}`);
        await this.recordFailure();
        return buildAssistantFallbackReply();
      }

      const json: unknown = await res.json();
      const parsed = assistantChatResponseSchema.safeParse(json);
      if (!parsed.success) {
        this.logger.warn("Assistant response failed contract validation");
        await this.recordFailure();
        return buildAssistantFallbackReply();
      }

      await this.recordSuccess();
      return parsed.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Assistant proxy error: ${message}`);
      await this.recordFailure();
      return buildAssistantFallbackReply();
    } finally {
      clearTimeout(timeout);
    }
  }
}
