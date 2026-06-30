import { Module } from "@nestjs/common";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { BillingService } from "./application/billing.service";
import { BillingController } from "./interface/http/billing.controller";

@Module({
  imports: [AuthModule, TimeModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService]
})
export class BillingModule {}
