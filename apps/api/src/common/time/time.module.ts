import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TimeAggregationService } from "./time-aggregation.service";

@Module({
  imports: [PrismaModule],
  providers: [TimeAggregationService],
  exports: [TimeAggregationService]
})
export class TimeModule {}
