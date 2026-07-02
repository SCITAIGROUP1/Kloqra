import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  type ListTasksQuery,
  ROUTES
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { AdminOrProjectManagerGuard } from "../../../../common/guards/admin-or-project-manager.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TasksService } from "../../application/tasks.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get(ROUTES.TASKS.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery
  ) {
    return this.tasks.list(user.workspaceId, user.userId, user.role, query, user.managedProjectIds);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Post(ROUTES.TASKS.CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTaskSchema)) body: unknown
  ) {
    return this.tasks.create(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TasksService["create"]>[3]
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Patch(ROUTES.TASKS.BY_ID(":id"))
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: unknown
  ) {
    return this.tasks.update(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<TasksService["update"]>[4]
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Delete(ROUTES.TASKS.BY_ID(":id"))
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.tasks.remove(user.workspaceId, user.userId, user.role, id);
  }
}
