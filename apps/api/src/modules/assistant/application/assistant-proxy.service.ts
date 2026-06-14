import {
  assistantChatResponseSchema,
  type AssistantChatRequestDto,
  type AssistantChatResponseDto,
  type AssistantInternalChatRequestDto
} from "@kloqra/contracts";
import { Injectable, Logger } from "@nestjs/common";
import { buildAssistantFallbackReply } from "./assistant-fallback";

const PROXY_TIMEOUT_MS = 30_000;
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
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  private get serviceUrl(): string {
    return (process.env.ASSISTANT_SERVICE_URL ?? "http://localhost:3003").replace(/\/$/, "");
  }

  private get internalSecret(): string | undefined {
    return process.env.ASSISTANT_INTERNAL_SECRET?.trim() || undefined;
  }

  private isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  private recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
      this.logger.warn("Assistant circuit breaker opened for 60s");
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  async chat(
    body: AssistantChatRequestDto,
    options: { userDisplayName?: string; requestId?: string }
  ): Promise<AssistantChatResponseDto> {
    if (!isAssistantEnabled()) {
      return buildAssistantFallbackReply();
    }

    if (this.isCircuitOpen()) {
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
        this.recordFailure();
        return buildAssistantFallbackReply();
      }

      const json: unknown = await res.json();
      const parsed = assistantChatResponseSchema.safeParse(json);
      if (!parsed.success) {
        this.logger.warn("Assistant response failed contract validation");
        this.recordFailure();
        return buildAssistantFallbackReply();
      }

      this.recordSuccess();
      return parsed.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Assistant proxy error: ${message}`);
      this.recordFailure();
      return buildAssistantFallbackReply();
    } finally {
      clearTimeout(timeout);
    }
  }
}
