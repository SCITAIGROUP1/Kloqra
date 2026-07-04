import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../common/queues";
import { AuthModule } from "../auth/auth.module";
import { ExportModule } from "../export/export.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TenantDataExportService } from "./application/tenant-data-export.service";
import { TenantDataExportWorker } from "./application/tenant-data-export.worker";
import { TenantDataImportService } from "./application/tenant-data-import.service";
import { TenantDataImportWorker } from "./application/tenant-data-import.worker";
import { ComplianceController } from "./interface/http/compliance.controller";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.TENANT_DATA_EXPORT }),
    BullModule.registerQueue({ name: QUEUES.TENANT_DATA_IMPORT }),
    AuthModule,
    ExportModule,
    NotificationsModule
  ],
  controllers: [ComplianceController],
  providers: [
    TenantDataExportService,
    TenantDataExportWorker,
    TenantDataImportService,
    TenantDataImportWorker
  ],
  exports: [TenantDataExportService, TenantDataImportService]
})
export class ComplianceModule {}
