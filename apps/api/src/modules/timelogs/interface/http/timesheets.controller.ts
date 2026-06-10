import {
  ROUTES,
  submitTimesheetSchema,
  timesheetStatusQuerySchema,
  timesheetSubmissionsQuerySchema
} from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimesheetsService } from "../../application/timesheets.service";

const reviewTimesheetSchema = z.object({
  reviewNote: z.string().optional()
});

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimesheetsController {
  constructor(private timesheets: TimesheetsService) {}

  @Get(ROUTES.TIMESHEETS.MY_STATUS)
  async getStatus(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(timesheetStatusQuerySchema))
    query: z.infer<typeof timesheetStatusQuerySchema>
  ) {
    const targetDate = query.date || new Date().toISOString();
    return this.timesheets.getStatus(user.workspaceId, user.userId, query.projectId, targetDate);
  }

  @Get(ROUTES.TIMESHEETS.MY_SUBMISSIONS)
  async listSubmissions(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(timesheetSubmissionsQuerySchema))
    query: z.infer<typeof timesheetSubmissionsQuerySchema>
  ) {
    const targetDate = query.date || new Date().toISOString();
    return this.timesheets.listSubmissions(user.workspaceId, user.userId, targetDate, query.scope);
  }

  @Post(ROUTES.TIMESHEETS.SUBMIT)
  async submit(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(submitTimesheetSchema)) body: z.infer<typeof submitTimesheetSchema>
  ) {
    return this.timesheets.submit(
      user.workspaceId,
      user.userId,
      body.projectId,
      body.date,
      body.note
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.TIMESHEETS.LIST_PENDING)
  async listPending(@CurrentUser() user: RequestUser) {
    return this.timesheets.listPending(user.workspaceId);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.TIMESHEETS.APPROVE(":id"))
  async approve(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reviewTimesheetSchema)) body: z.infer<typeof reviewTimesheetSchema>
  ) {
    return this.timesheets.approve(user.workspaceId, id, user.userId, body.reviewNote);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.TIMESHEETS.REJECT(":id"))
  async reject(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reviewTimesheetSchema)) body: z.infer<typeof reviewTimesheetSchema>
  ) {
    return this.timesheets.reject(user.workspaceId, id, user.userId, body.reviewNote);
  }
}
