import { z } from "zod";
import { PLAN_SLUGS } from "../plan-catalog";
import { type billingAlertSchema } from "../tenant-rbac";

export const paidPlanSlugSchema = z.enum([PLAN_SLUGS.STARTER, PLAN_SLUGS.PRO]);

export const billingModeSchema = z.enum(["stripe", "simulated"]);

export const changeSubscriptionPlanSchema = z.object({
  planSlug: paidPlanSlugSchema
});

export const createCheckoutSessionSchema = z.object({
  planSlug: paidPlanSlugSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const checkoutSessionResponseSchema = z.object({
  url: z.string().url()
});

export const portalSessionResponseSchema = z.object({
  url: z.string().url()
});

export const paymentRequiredDetailsSchema = z.object({
  status: z.string()
});

export type PaidPlanSlug = z.infer<typeof paidPlanSlugSchema>;
export type BillingMode = z.infer<typeof billingModeSchema>;
export type ChangeSubscriptionPlanDto = z.infer<typeof changeSubscriptionPlanSchema>;
export type CreateCheckoutSessionDto = z.infer<typeof createCheckoutSessionSchema>;
export type CheckoutSessionResponseDto = z.infer<typeof checkoutSessionResponseSchema>;
export type PortalSessionResponseDto = z.infer<typeof portalSessionResponseSchema>;
export type PaymentRequiredDetails = z.infer<typeof paymentRequiredDetailsSchema>;
export type BillingAlert = z.infer<typeof billingAlertSchema>;
