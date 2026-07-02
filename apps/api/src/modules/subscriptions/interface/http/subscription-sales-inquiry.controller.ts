import { createSalesInquirySchema, ROUTES, type CreateSalesInquiryDto } from "@kloqra/contracts";
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { BILLING_RECEIPT_MAX_BYTES } from "../../application/billing-receipt-storage.util";
import { SubscriptionSalesInquiryService } from "../../application/subscription-sales-inquiry.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class SubscriptionSalesInquiryController {
  constructor(private salesInquiries: SubscriptionSalesInquiryService) {}

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.SALES_INQUIRY)
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.salesInquiries.getCurrentInquiry(user.tenantId);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.SALES_INQUIRY)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createSalesInquirySchema)) body: CreateSalesInquiryDto
  ) {
    return this.salesInquiries.createInquiry(user.tenantId, user.userId, body);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.SALES_INQUIRY_RECEIPTS)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: BILLING_RECEIPT_MAX_BYTES } }))
  uploadReceipt(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ) {
    return this.salesInquiries.uploadReceipt(user.tenantId, user.userId, file);
  }
}
