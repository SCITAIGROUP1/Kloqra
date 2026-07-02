import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformGuard } from "../../../../common/guards/platform.guard";
import { PlatformOpsService } from "../../application/platform-ops.service";

@Controller()
@UseGuards(PlatformGuard)
export class PlatformOpsController {
  constructor(private ops: PlatformOpsService) {}

  @Get(ROUTES.PLATFORM.OPS_SUMMARY)
  summary(@CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.ops.getOpsSummary();
  }
}
