import { listPlatformAuditEventsQuerySchema, ROUTES } from "@kloqra/contracts";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PlatformSuperadminGuard } from "../../../../common/guards/platform-superadmin.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { PlatformAuditService } from "../../application/platform-audit.service";

@Controller()
@UseGuards(PlatformSuperadminGuard)
export class PlatformAuditController {
  constructor(private audit: PlatformAuditService) {}

  @Get(ROUTES.PLATFORM.AUDIT_EVENTS)
  list(@Query(new ZodValidationPipe(listPlatformAuditEventsQuerySchema)) query: unknown) {
    return this.audit.list(query as Parameters<PlatformAuditService["list"]>[0]);
  }
}
