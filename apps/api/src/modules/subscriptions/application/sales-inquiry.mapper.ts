import type { SalesInquiryDto, PlanSlug } from "@kloqra/contracts";
import { PLAN_SLUGS } from "@kloqra/contracts";

type InquiryRow = {
  id: string;
  tenantId: string;
  message: string | null;
  billingInterval: string | null;
  status: string;
  instructionsSentAt: Date | null;
  createdAt: Date;
  fulfilledAt: Date | null;
  requestedPlan: { slug: string; name: string };
  receipts?: {
    id: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    createdAt: Date;
  }[];
};

export function toSalesInquiryDto(row: InquiryRow): SalesInquiryDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    planSlug: row.requestedPlan.slug as typeof PLAN_SLUGS.PILOT,
    planName: row.requestedPlan.name,
    status: row.status as SalesInquiryDto["status"],
    message: row.message,
    billingInterval: (row.billingInterval as SalesInquiryDto["billingInterval"]) ?? null,
    instructionsSentAt: row.instructionsSentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
    receipts: row.receipts?.map((receipt) => ({
      id: receipt.id,
      filename: receipt.filename,
      contentType: receipt.contentType,
      sizeBytes: receipt.sizeBytes,
      createdAt: receipt.createdAt.toISOString()
    }))
  };
}

export function isContactPlanSlug(slug: string): slug is typeof PLAN_SLUGS.PILOT {
  return slug === PLAN_SLUGS.PILOT;
}

export function asPlanSlug(slug: string): PlanSlug {
  return slug as PlanSlug;
}
