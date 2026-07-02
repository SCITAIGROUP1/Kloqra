import { Module } from "@nestjs/common";
import { PlatformAuditService } from "./application/platform-audit.service";

@Module({
  providers: [PlatformAuditService],
  exports: [PlatformAuditService]
})
export class PlatformAuditModule {}
