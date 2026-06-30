import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "../../common/queues";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { ReportingModule } from "../reporting/reporting.module";
import { ExportJobService } from "./application/export-job.service";
import { ExportPresetService } from "./application/export-preset.service";
import { ExportRowsBuilder } from "./application/export-rows.builder";
import { ExportScheduleService } from "./application/export-schedule.service";
import { ExportShareService } from "./application/export-share.service";
import { ExportService } from "./application/export.service";
import { ExportWorker } from "./application/export.worker";
import { InvoiceService } from "./application/invoice.service";
import { ExportShareController } from "./interface/http/export-share.controller";
import { ExportController } from "./interface/http/export.controller";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.EXPORT }),
    AuthModule,
    TimeModule,
    ReportingModule,
    ProjectsModule,
    NotificationsModule
  ],
  controllers: [ExportController, ExportShareController],
  providers: [
    ExportService,
    ExportRowsBuilder,
    ExportPresetService,
    ExportScheduleService,
    ExportShareService,
    ExportJobService,
    InvoiceService,
    ExportWorker
  ],
  exports: [ExportService, ExportJobService, InvoiceService]
})
export class ExportModule {}
