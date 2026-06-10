import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Param } from "@nestjs/common";
import { ExportShareService } from "../../application/export-share.service";

@Controller()
export class ExportShareController {
  constructor(private exportShares: ExportShareService) {}

  @Get(ROUTES.EXPORT.SHARE(":token"))
  async getShare(@Param("token") token: string) {
    return this.exportShares.getPublicView(token);
  }
}
