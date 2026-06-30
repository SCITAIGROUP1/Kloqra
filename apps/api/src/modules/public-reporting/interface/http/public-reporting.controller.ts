import {
  reportQuerySchema,
  utilizationQuerySchema,
  type UtilizationQueryDto,
  ROUTES
} from "@kloqra/contracts";
import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiCredential,
  type ApiCredentialContext
} from "../../../../common/decorators/api-credential.decorator";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
// eslint-disable-next-line no-restricted-imports
import { ReportingService } from "../../../reporting/application/reporting.service";
import { ReportingApiCredentialService } from "../../application/reporting-api-credential.service";
import { ApiKeyAuthGuard } from "../../guards/api-key-auth.guard";

@Controller()
@UseGuards(ApiKeyAuthGuard)
export class PublicReportingController {
  constructor(
    private reporting: ReportingService,
    private credentials: ReportingApiCredentialService
  ) {}

  @Get(ROUTES.PUBLIC_REPORTING.DASHBOARD)
  dashboard(
    @ApiCredential() credential: ApiCredentialContext,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.dashboard(
      credential.workspaceId,
      query as Parameters<ReportingService["dashboard"]>[1],
      credential.projectIds
    );
  }

  @Get(ROUTES.PUBLIC_REPORTING.UTILIZATION)
  utilization(
    @ApiCredential() credential: ApiCredentialContext,
    @Query(new ZodValidationPipe(utilizationQuerySchema)) query: UtilizationQueryDto
  ) {
    return this.reporting.utilization(credential.workspaceId, query, credential.projectIds);
  }

  @Get(ROUTES.PUBLIC_REPORTING.BUDGET(":id"))
  budgetBurnDown(@ApiCredential() credential: ApiCredentialContext, @Param("id") id: string) {
    this.credentials.assertProjectAccess(credential, id);
    return this.reporting.budgetBurnDown(credential.workspaceId, id);
  }

  @Get(ROUTES.PUBLIC_REPORTING.HEATMAP)
  heatmap(
    @ApiCredential() credential: ApiCredentialContext,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.heatmap(
      credential.workspaceId,
      query as Parameters<ReportingService["heatmap"]>[1],
      credential.projectIds
    );
  }

  @Get(ROUTES.PUBLIC_REPORTING.CATEGORIES_HEATMAP)
  categoriesHeatmap(
    @ApiCredential() credential: ApiCredentialContext,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.categoryProjectHeatmap(
      credential.workspaceId,
      query as Parameters<ReportingService["categoryProjectHeatmap"]>[1],
      credential.projectIds
    );
  }

  @Get(ROUTES.PUBLIC_REPORTING.TASKS)
  tasks(
    @ApiCredential() credential: ApiCredentialContext,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.reporting.tasks(
      credential.workspaceId,
      query as Parameters<ReportingService["tasks"]>[1],
      credential.projectIds
    );
  }
}
