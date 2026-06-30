import { Module } from "@nestjs/common";
import { RedisModule } from "../../common/redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectsModule } from "../projects/projects.module";
import { TimelogAuditService } from "./application/timelog-audit.service";
import { TimelogsService } from "./application/timelogs.service";
import { TimesheetAmendmentsService } from "./application/timesheet-amendments.service";
import { TimesheetLockService } from "./application/timesheet-lock.service";
import { TimesheetMissingDigestService } from "./application/timesheet-missing-digest.service";
import { TimesheetReminderService } from "./application/timesheet-reminder.service";
import { TimesheetsService } from "./application/timesheets.service";
import { TimelogsController } from "./interface/http/timelogs.controller";
import { TimesheetsController } from "./interface/http/timesheets.controller";

@Module({
  imports: [AuthModule, ProjectsModule, NotificationsModule, RedisModule],
  controllers: [TimelogsController, TimesheetsController],
  providers: [
    TimelogsService,
    TimesheetsService,
    TimesheetAmendmentsService,
    TimesheetReminderService,
    TimesheetMissingDigestService,
    TimelogAuditService,
    TimesheetLockService
  ],
  exports: [TimelogsService, TimesheetsService, TimelogAuditService, TimesheetLockService]
})
export class TimelogsModule {}
