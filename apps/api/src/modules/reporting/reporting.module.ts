import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { ReportingService } from "./application/reporting.service";
import { WidgetShareService } from "./application/widget-share.service";
import { ReportingController } from "./interface/http/reporting.controller";
import { WidgetShareController } from "./interface/http/widget-share.controller";

@Module({
  imports: [AuthModule, TimeModule, AccessModule],
  controllers: [ReportingController, WidgetShareController],
  providers: [ReportingService, WidgetShareService],
  exports: [ReportingService, WidgetShareService]
})
export class ReportingModule {}
