import { startTimerSchema, stopTimerSchema, ROUTES } from "@kloqra/contracts";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimerService } from "../../application/timer.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class TimerController {
  constructor(private timer: TimerService) {}

  @Post(ROUTES.TIMER.START)
  start(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(startTimerSchema)) body: unknown
  ) {
    return this.timer.start(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TimerService["start"]>[3]
    );
  }

  @Post(ROUTES.TIMER.STOP)
  stop(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(stopTimerSchema)) body: unknown
  ) {
    return this.timer.stop(
      user.workspaceId,
      user.userId,
      body as Parameters<TimerService["stop"]>[2]
    );
  }

  @Get(ROUTES.TIMER.ACTIVE)
  active(@CurrentUser() user: RequestUser) {
    return this.timer.active(user.workspaceId, user.userId);
  }

  @Post(ROUTES.TIMER.PAUSE)
  pause(@CurrentUser() user: RequestUser) {
    return this.timer.pause(user.workspaceId, user.userId);
  }

  @Post(ROUTES.TIMER.RESUME)
  resume(@CurrentUser() user: RequestUser) {
    return this.timer.resume(user.workspaceId, user.userId);
  }

  @Post(ROUTES.TIMER.DISCARD)
  discard(@CurrentUser() user: RequestUser) {
    return this.timer.discard(user.workspaceId, user.userId);
  }

  @Get(ROUTES.TIMER.ACTIVE_COUNT)
  activeCount(@CurrentUser() user: RequestUser) {
    return this.timer.activeCount(user.workspaceId);
  }
}
