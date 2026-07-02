import {
  ErrorCodes,
  type CreateSalesInquiryDto,
  type SalesInquiryDto,
  type SalesInquiryListResponseDto
} from "@kloqra/contracts";
import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { BillingMailer } from "../../../common/mailer/billing.mailer";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { PlatformNotificationsDispatchService } from "../../platform/application/platform-notifications-dispatch.service";
import {
  notifySalesInquiry,
  notifySalesReceiptUploaded
} from "../../platform/application/platform-notifications.helper";
import { resolvePublicAdminUrl } from "../admin-app-url.util";
import {
  BILLING_RECEIPT_ALLOWED_TYPES,
  BILLING_RECEIPT_MAX_BYTES,
  buildBillingReceiptStorageKey,
  extensionForReceiptContentType,
  readBillingReceiptFile,
  writeBillingReceiptFile
} from "./billing-receipt-storage.util";
import { isContactPlanSlug, toSalesInquiryDto } from "./sales-inquiry.mapper";

const ACTIVE_INQUIRY_STATUSES = ["open", "awaiting_receipt", "receipt_submitted"] as const;

@Injectable()
export class SubscriptionSalesInquiryService {
  constructor(
    private prisma: PrismaService,
    private billingMailer: BillingMailer,
    private platformNotifications: PlatformNotificationsDispatchService
  ) {}

  private billingUrl(): string {
    return `${resolvePublicAdminUrl()}/account/billing`;
  }

  private inquiryInclude() {
    return {
      requestedPlan: { select: { slug: true, name: true, billingMode: true } },
      receipts: {
        orderBy: { createdAt: "desc" as const },
        select: {
          id: true,
          filename: true,
          contentType: true,
          sizeBytes: true,
          createdAt: true
        }
      }
    };
  }

  async getCurrentInquiry(tenantId: string): Promise<SalesInquiryDto | null> {
    const row = await generatedPrisma(this.prisma).tenantSalesInquiry.findFirst({
      where: {
        tenantId,
        status: { in: [...ACTIVE_INQUIRY_STATUSES] }
      },
      orderBy: { createdAt: "desc" },
      include: this.inquiryInclude()
    });
    return row ? toSalesInquiryDto(row) : null;
  }

  async createInquiry(
    tenantId: string,
    userId: string,
    dto: CreateSalesInquiryDto
  ): Promise<SalesInquiryDto> {
    const db = generatedPrisma(this.prisma);
    const plan = await db.plan.findUnique({ where: { slug: dto.planSlug } });
    if (!plan || plan.billingMode !== "contact") {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Plan is not available for contact sales",
        HttpStatus.BAD_REQUEST
      );
    }

    const existing = await db.tenantSalesInquiry.findFirst({
      where: {
        tenantId,
        requestedPlanId: plan.id,
        status: { in: [...ACTIVE_INQUIRY_STATUSES] }
      }
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: "An open sales inquiry already exists for this plan"
      });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true }
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Tenant not found"
      });
    }

    const requester = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });
    if (!requester) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "User not found"
      });
    }

    const row = await db.tenantSalesInquiry.create({
      data: {
        tenantId,
        requestedPlanId: plan.id,
        requestedByUserId: userId,
        message: dto.message?.trim() || null,
        billingInterval: dto.billingInterval ?? null,
        status: "open"
      },
      include: this.inquiryInclude()
    });

    notifySalesInquiry(this.platformNotifications, {
      tenantId,
      tenantName: tenant.name,
      planName: plan.name,
      message: row.message
    });

    if (requester.email) {
      await this.billingMailer.sendSalesInquiryReceived({
        to: requester.email,
        name: requester.name,
        planName: plan.name,
        billingUrl: this.billingUrl()
      });
    }

    return toSalesInquiryDto(row);
  }

  async uploadReceipt(
    tenantId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ): Promise<SalesInquiryDto> {
    if (!file?.buffer?.length) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Receipt file is required",
        HttpStatus.BAD_REQUEST
      );
    }
    if (file.size > BILLING_RECEIPT_MAX_BYTES) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Receipt file exceeds 5 MB limit",
        HttpStatus.BAD_REQUEST
      );
    }
    const contentType = file.mimetype?.toLowerCase() ?? "";
    if (!BILLING_RECEIPT_ALLOWED_TYPES.has(contentType)) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Receipt must be PDF, PNG, or JPG",
        HttpStatus.BAD_REQUEST
      );
    }

    const db = generatedPrisma(this.prisma);
    const inquiry = await db.tenantSalesInquiry.findFirst({
      where: {
        tenantId,
        status: "awaiting_receipt"
      },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { name: true } },
        requestedPlan: { select: { slug: true, name: true, billingMode: true } }
      }
    });
    if (!inquiry) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "No inquiry is awaiting a receipt upload"
      });
    }

    const storageKey = buildBillingReceiptStorageKey(
      inquiry.id,
      extensionForReceiptContentType(contentType)
    );
    await writeBillingReceiptFile(storageKey, file.buffer);

    await db.tenantSalesInquiryReceipt.create({
      data: {
        inquiryId: inquiry.id,
        uploadedByUserId: userId,
        filename: file.originalname?.slice(0, 255) || "receipt",
        contentType,
        storageKey,
        sizeBytes: file.size
      }
    });

    const updated = await db.tenantSalesInquiry.update({
      where: { id: inquiry.id },
      data: { status: "receipt_submitted" },
      include: this.inquiryInclude()
    });

    notifySalesReceiptUploaded(this.platformNotifications, {
      tenantId,
      tenantName: inquiry.tenant.name,
      planName: inquiry.requestedPlan.name,
      inquiryId: inquiry.id
    });

    return toSalesInquiryDto(updated);
  }

  async listForTenant(tenantId: string): Promise<SalesInquiryListResponseDto> {
    const rows = await generatedPrisma(this.prisma).tenantSalesInquiry.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: this.inquiryInclude()
    });
    return { items: rows.map((row) => toSalesInquiryDto(row)) };
  }

  async sendPaymentInstructions(tenantId: string, inquiryId: string): Promise<SalesInquiryDto> {
    const db = generatedPrisma(this.prisma);
    const inquiry = await db.tenantSalesInquiry.findFirst({
      where: { id: inquiryId, tenantId },
      include: {
        requestedPlan: { select: { slug: true, name: true, billingMode: true } },
        requestedBy: { select: { email: true, name: true } }
      }
    });
    if (!inquiry) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Sales inquiry not found"
      });
    }
    if (inquiry.status !== "open") {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: "Payment instructions were already sent for this inquiry"
      });
    }

    const instructions =
      process.env.BILLING_MANUAL_PAYMENT_INSTRUCTIONS?.trim() ||
      "Please contact billing@kloqra.com for wire transfer details.";

    if (inquiry.requestedBy.email) {
      await this.billingMailer.sendPaymentInstructions({
        to: inquiry.requestedBy.email,
        name: inquiry.requestedBy.name,
        planName: inquiry.requestedPlan.name,
        billingInterval: inquiry.billingInterval,
        instructions,
        billingUrl: this.billingUrl()
      });
    }

    const updated = await db.tenantSalesInquiry.update({
      where: { id: inquiry.id },
      data: {
        status: "awaiting_receipt",
        instructionsSentAt: new Date()
      },
      include: this.inquiryInclude()
    });

    return toSalesInquiryDto(updated);
  }

  async fulfillOpenInquiryForPlan(tenantId: string, planId: string): Promise<void> {
    const db = generatedPrisma(this.prisma);
    const inquiry = await db.tenantSalesInquiry.findFirst({
      where: {
        tenantId,
        requestedPlanId: planId,
        status: { in: [...ACTIVE_INQUIRY_STATUSES] }
      },
      orderBy: { createdAt: "desc" },
      include: {
        requestedPlan: { select: { name: true } },
        tenant: { select: { id: true } }
      }
    });
    if (!inquiry) return;

    await db.tenantSalesInquiry.update({
      where: { id: inquiry.id },
      data: { status: "fulfilled", fulfilledAt: new Date() }
    });

    const owner = await db.tenantMember.findFirst({
      where: { tenantId, role: "OWNER", isActive: true },
      include: { user: { select: { email: true, name: true } } }
    });
    if (owner?.user.email) {
      await this.billingMailer.sendPlanActivatedByPlatform({
        to: owner.user.email,
        name: owner.user.name,
        planName: inquiry.requestedPlan.name,
        billingUrl: this.billingUrl()
      });
    }
  }

  async getReceiptForDownload(
    tenantId: string,
    inquiryId: string,
    receiptId: string
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const db = generatedPrisma(this.prisma);
    const receipt = await db.tenantSalesInquiryReceipt.findFirst({
      where: {
        id: receiptId,
        inquiry: { id: inquiryId, tenantId }
      }
    });
    if (!receipt) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Receipt not found"
      });
    }

    const buffer = await readBillingReceiptFile(receipt.storageKey);
    return {
      buffer,
      filename: receipt.filename,
      contentType: receipt.contentType
    };
  }

  assertContactPlanSlug(slug: string): void {
    if (!isContactPlanSlug(slug)) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid contact plan slug",
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
