import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Param, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { PlatformSuperadminGuard } from "../../../../common/guards/platform-superadmin.guard";
import { SubscriptionSalesInquiryService } from "../../../subscriptions/application/subscription-sales-inquiry.service";

@Controller()
@UseGuards(PlatformSuperadminGuard)
export class PlatformSalesInquiriesController {
  constructor(private salesInquiries: SubscriptionSalesInquiryService) {}

  @Get(ROUTES.PLATFORM.TENANT_SALES_INQUIRIES(":tenantId"))
  list(@Param("tenantId") tenantId: string, @CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.salesInquiries.listForTenant(tenantId);
  }

  @Post(ROUTES.PLATFORM.TENANT_SALES_INQUIRY_SEND_INSTRUCTIONS(":tenantId", ":inquiryId"))
  sendInstructions(
    @Param("tenantId") tenantId: string,
    @Param("inquiryId") inquiryId: string,
    @CurrentPlatformUser() _user: PlatformRequestUser
  ) {
    return this.salesInquiries.sendPaymentInstructions(tenantId, inquiryId);
  }

  @Get(ROUTES.PLATFORM.TENANT_SALES_INQUIRY_RECEIPT(":tenantId", ":inquiryId", ":receiptId"))
  async downloadReceipt(
    @Param("tenantId") tenantId: string,
    @Param("inquiryId") inquiryId: string,
    @Param("receiptId") receiptId: string,
    @Res() res: Response
  ) {
    const file = await this.salesInquiries.getReceiptForDownload(tenantId, inquiryId, receiptId);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }
}
