import { Module } from "@nestjs/common";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { ReportingModule } from "../reporting/reporting.module";
import { ExportPresetService } from "./application/export-preset.service";
import { ExportRowsBuilder } from "./application/export-rows.builder";
import { ExportScheduleService } from "./application/export-schedule.service";
import { ExportShareService } from "./application/export-share.service";
import { ExportService } from "./application/export.service";
import { InvoiceService } from "./application/invoice.service";
import { ExportShareController } from "./interface/http/export-share.controller";
import { ExportController } from "./interface/http/export.controller";

@Module({
  imports: [AuthModule, TimeModule, ReportingModule, ProjectsModule],
  controllers: [ExportController, ExportShareController],
  providers: [
    ExportService,
    ExportRowsBuilder,
    ExportPresetService,
    ExportScheduleService,
    ExportShareService,
    InvoiceService
  ],
  exports: [ExportService, InvoiceService]
})
export class ExportModule {}
