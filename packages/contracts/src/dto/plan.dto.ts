import { z } from "zod";
import { planLimitsSchema } from "../tenant-rbac";
import { slugSchema, uuidSchema } from "./common.dto";

export const planBillingModeSchema = z.enum(["stripe", "contact"]);

export const planCatalogItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  limits: planLimitsSchema,
  isPublic: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  stripeProductId: z.string().min(1).max(120).nullable().optional(),
  stripePriceId: z.string().min(1).max(120).nullable().optional(),
  tagline: z.string().max(500).nullable().optional(),
  monthlyPriceCents: z.number().int().nonnegative().nullable().optional(),
  yearlyPriceCents: z.number().int().nonnegative().nullable().optional(),
  features: z.array(z.string().min(1).max(200)).optional(),
  recommended: z.boolean(),
  billingMode: planBillingModeSchema,
  contactHref: z.string().max(500).nullable().optional(),
  visibleOnPricing: z.boolean()
});

export const planCatalogListResponseSchema = z.object({
  items: z.array(planCatalogItemSchema)
});

export const platformCatalogSettingsSchema = z.object({
  pricingBaselineFeatures: z.array(z.string().min(1).max(200))
});

export const updatePlatformCatalogSettingsSchema = z.object({
  pricingBaselineFeatures: z.array(z.string().min(1).max(200)).min(1)
});

export const planPricingItemSchema = planCatalogItemSchema.extend({
  displayFeatures: z.array(z.string().min(1).max(200))
});

export const planPricingCatalogSchema = z.object({
  baselineFeatures: z.array(z.string().min(1).max(200)),
  items: z.array(planPricingItemSchema)
});

export const updatePlatformPlanSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    limits: planLimitsSchema.optional(),
    isPublic: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    stripeProductId: z.string().min(1).max(120).nullable().optional(),
    stripePriceId: z.string().min(1).max(120).nullable().optional(),
    tagline: z.string().max(500).nullable().optional(),
    monthlyPriceCents: z.number().int().nonnegative().nullable().optional(),
    yearlyPriceCents: z.number().int().nonnegative().nullable().optional(),
    features: z.array(z.string().min(1).max(200)).optional(),
    recommended: z.boolean().optional(),
    billingMode: planBillingModeSchema.optional(),
    contactHref: z.string().max(500).nullable().optional(),
    visibleOnPricing: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field is required"
  });

export type PlanBillingMode = z.infer<typeof planBillingModeSchema>;
export type PlanCatalogItemDto = z.infer<typeof planCatalogItemSchema>;
export type PlanCatalogListResponseDto = z.infer<typeof planCatalogListResponseSchema>;
export type PlatformCatalogSettingsDto = z.infer<typeof platformCatalogSettingsSchema>;
export type UpdatePlatformCatalogSettingsDto = z.infer<typeof updatePlatformCatalogSettingsSchema>;
export type PlanPricingItemDto = z.infer<typeof planPricingItemSchema>;
export type PlanPricingCatalogDto = z.infer<typeof planPricingCatalogSchema>;
export type UpdatePlatformPlanDto = z.infer<typeof updatePlatformPlanSchema>;

/** Format USD cents for marketing display (e.g. 2900 → "$29"). */
export function formatPlanPriceUsd(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
