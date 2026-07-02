import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../common/queues";
import { AuthModule } from "../auth/auth.module";
import { ExportModule } from "../export/export.module";
import { TenantDataExportService } from "./application/tenant-data-export.service";
import { TenantDataExportWorker } from "./application/tenant-data-export.worker";
import { ComplianceController } from "./interface/http/compliance.controller";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.TENANT_DATA_EXPORT }),
    AuthModule,
    ExportModule
  ],
  controllers: [ComplianceController],
  providers: [TenantDataExportService, TenantDataExportWorker],
  exports: [TenantDataExportService]
})
export class ComplianceModule {}
