import { assistantChatRequestSchema, ROUTES } from "@kloqra/contracts";
import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AssistantProxyService } from "../../application/assistant-proxy.service";
import { AssistantRateLimitService } from "../../application/assistant-rate-limit.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(
    private proxy: AssistantProxyService,
    private rateLimit: AssistantRateLimitService
  ) {}

  @Post(ROUTES.ASSISTANT.CHAT)
  async chat(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(assistantChatRequestSchema)) body: unknown,
    @Req() req: Request
  ) {
    await this.rateLimit.assertWithinLimit(user.userId);
    const requestId =
      typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
    return this.proxy.chat(body as Parameters<AssistantProxyService["chat"]>[0], {
      requestId
    });
  }
}
