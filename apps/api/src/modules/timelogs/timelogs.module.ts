import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TimelogAuditService } from "./application/timelog-audit.service";
import { TimelogsService } from "./application/timelogs.service";
import { TimesheetLockService } from "./application/timesheet-lock.service";
import { TimesheetsService } from "./application/timesheets.service";
import { TimelogsController } from "./interface/http/timelogs.controller";
import { TimesheetsController } from "./interface/http/timesheets.controller";

@Module({
  imports: [AuthModule],
  controllers: [TimelogsController, TimesheetsController],
  providers: [TimelogsService, TimesheetsService, TimelogAuditService, TimesheetLockService],
  exports: [TimelogsService, TimesheetsService, TimelogAuditService, TimesheetLockService]
})
export class TimelogsModule {}
