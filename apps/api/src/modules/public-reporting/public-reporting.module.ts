import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReportingModule } from "../reporting/reporting.module";
import { ReportingApiCredentialService } from "./application/reporting-api-credential.service";
import { ApiKeyAuthGuard } from "./guards/api-key-auth.guard";
import { PublicReportingController } from "./interface/http/public-reporting.controller";
import { ReportingApiKeysController } from "./interface/http/reporting-api-keys.controller";

@Module({
  imports: [AuthModule, ReportingModule],
  controllers: [PublicReportingController, ReportingApiKeysController],
  providers: [ReportingApiCredentialService, ApiKeyAuthGuard],
  exports: [ReportingApiCredentialService]
})
export class PublicReportingModule {}
