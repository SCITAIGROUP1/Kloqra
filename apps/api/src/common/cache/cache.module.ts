import { Global, Module } from "@nestjs/common";
import { ReportCacheService } from "./report-cache.service";

@Global()
@Module({
  providers: [ReportCacheService],
  exports: [ReportCacheService]
})
export class CacheModule {}
