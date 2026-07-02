import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { AuthModule } from "../auth/auth.module";
import { PresenceService } from "./application/presence.service";
import { PresenceController } from "./interface/http/presence.controller";

@Module({
  imports: [AuthModule, AccessModule],
  controllers: [PresenceController],
  providers: [PresenceService],
  exports: [PresenceService]
})
export class PresenceModule {}
