import { z } from "zod";
import { PLAN_SLUGS } from "../plan-catalog";
import { uuidSchema } from "./common.dto";

export const contactPlanSlugSchema = z.enum([PLAN_SLUGS.PILOT]);

export const salesInquiryStatusSchema = z.enum([
  "open",
  "awaiting_receipt",
  "receipt_submitted",
  "fulfilled",
  "closed"
]);

export const salesInquiryBillingIntervalSchema = z.enum(["monthly", "yearly"]);

export const createSalesInquirySchema = z.object({
  planSlug: contactPlanSlugSchema,
  message: z.string().max(1000).optional(),
  billingInterval: salesInquiryBillingIntervalSchema.optional()
});

export const salesInquiryReceiptSchema = z.object({
  id: uuidSchema,
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  createdAt: z.string().datetime()
});

export const salesInquirySchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  planSlug: contactPlanSlugSchema,
  planName: z.string().min(1).max(120),
  status: salesInquiryStatusSchema,
  message: z.string().nullable(),
  billingInterval: salesInquiryBillingIntervalSchema.nullable(),
  instructionsSentAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  fulfilledAt: z.string().datetime().nullable(),
  receipts: z.array(salesInquiryReceiptSchema).optional()
});

export const salesInquiryResponseSchema = salesInquirySchema;

export const salesInquiryListResponseSchema = z.object({
  items: z.array(salesInquirySchema)
});

export type ContactPlanSlug = z.infer<typeof contactPlanSlugSchema>;
export type SalesInquiryStatus = z.infer<typeof salesInquiryStatusSchema>;
export type SalesInquiryBillingInterval = z.infer<typeof salesInquiryBillingIntervalSchema>;
export type CreateSalesInquiryDto = z.infer<typeof createSalesInquirySchema>;
export type SalesInquiryReceiptDto = z.infer<typeof salesInquiryReceiptSchema>;
export type SalesInquiryDto = z.infer<typeof salesInquirySchema>;
export type SalesInquiryListResponseDto = z.infer<typeof salesInquiryListResponseSchema>;
