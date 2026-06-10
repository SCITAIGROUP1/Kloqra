import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
  type ListCategoriesQuery,
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
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { CategoriesService } from "../../application/categories.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get(ROUTES.CATEGORIES.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listCategoriesQuerySchema)) query: ListCategoriesQuery
  ) {
    return this.categories.list(user.workspaceId, query);
  }

  @Roles("ADMIN")
  @Post(ROUTES.CATEGORIES.CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: unknown
  ) {
    return this.categories.create(
      user.workspaceId,
      body as Parameters<CategoriesService["create"]>[1]
    );
  }

  @Roles("ADMIN")
  @Patch(ROUTES.CATEGORIES.BY_ID(":id"))
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: unknown
  ) {
    return this.categories.update(
      user.workspaceId,
      id,
      body as Parameters<CategoriesService["update"]>[2]
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.CATEGORIES.BY_ID(":id"))
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.categories.remove(user.workspaceId, id);
  }
}
