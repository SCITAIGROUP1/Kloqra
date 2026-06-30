import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Param } from "@nestjs/common";
import { WidgetShareService } from "../../application/widget-share.service";

@Controller()
export class WidgetShareController {
  constructor(private widgetShares: WidgetShareService) {}

  @Get(ROUTES.REPORTING.WIDGET_SHARE(":token"))
  async getShare(@Param("token") token: string) {
    return this.widgetShares.getPublicView(token);
  }
}
