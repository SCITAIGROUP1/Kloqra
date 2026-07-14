import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { planLimitsSchema, subscriptionStatusSchema, tenantStatusSchema } from "../tenant-rbac";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const platformSubscriptionEventSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  subscriptionId: uuidSchema,
  eventType: z.string(), // 'created' | 'plan_changed' | 'status_changed' | 'period_renewed' | 'trial_started' | 'trial_ended' | 'trial_extended' | 'canceled'
  occurredAt: isoDatetimeSchema,
  fromPlanId: uuidSchema.nullable(),
  fromPlanName: z.string().nullable().optional(),
  toPlanId: uuidSchema.nullable(),
  toPlanName: z.string().nullable().optional(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  actorType: z.enum(["system", "platform_user", "tenant_owner"]),
  actorId: uuidSchema.nullable(),
  metadata: z.any().nullable().optional(),
  createdAt: isoDatetimeSchema
});

export const platformSubscriptionListItemSchema = z.object({
  tenantId: uuidSchema,
  tenantName: z.string(),
  tenantSlug: z.string(),
  tenantStatus: tenantStatusSchema,
  planId: uuidSchema,
  planName: z.string(),
  planSlug: z.string(),
  status: subscriptionStatusSchema,
  billingInterval: z.string().nullable(),
  currentPeriodStart: isoDatetimeSchema.nullable(),
  currentPeriodEnd: isoDatetimeSchema.nullable(),
  trialEndsAt: isoDatetimeSchema.nullable(),
  planAssignedAt: isoDatetimeSchema,
  billingSource: z.string(), // 'stripe' | 'simulated' | 'manual'
  daysOnPlan: z.number(),
  workItem: z
    .enum(["past_due", "trial_ending", "sales_open", "sales_receipt_submitted", "drift"])
    .nullable(),
  salesInquiryId: uuidSchema.nullable().optional()
});

export const platformSubscriptionDetailSchema = platformSubscriptionListItemSchema.extend({
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  limitsOverride: planLimitsSchema.nullable().optional(),
  events: z.array(platformSubscriptionEventSchema)
});

export const platformSubscriptionListResponseSchema = createPaginatedListResponseSchema(
  platformSubscriptionListItemSchema
);

export const listPlatformSubscriptionsQuerySchema = listPaginationQuerySchema.extend({
  status: subscriptionStatusSchema.optional(),
  planSlug: z.string().optional(),
  billingSource: z.string().optional(),
  renewingWithinDays: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().positive().optional()
  ),
  workItem: z
    .enum(["past_due", "trial_ending", "sales_open", "sales_receipt_submitted", "drift"])
    .optional()
});

export const platformSubscriptionWorkQueueCountsSchema = z.object({
  pastDue: z.number().int().nonnegative(),
  trialEnding: z.number().int().nonnegative(),
  salesPending: z.number().int().nonnegative(),
  receiptReview: z.number().int().nonnegative(),
  drift: z.number().int().nonnegative()
});

export const platformSubscriptionWorkQueueSchema = z.object({
  counts: platformSubscriptionWorkQueueCountsSchema,
  items: z.array(platformSubscriptionListItemSchema)
});

export type PlatformSubscriptionEventDto = z.infer<typeof platformSubscriptionEventSchema>;
export type PlatformSubscriptionListItemDto = z.infer<typeof platformSubscriptionListItemSchema>;
export type PlatformSubscriptionDetailDto = z.infer<typeof platformSubscriptionDetailSchema>;
export type PlatformSubscriptionListResponseDto = z.infer<
  typeof platformSubscriptionListResponseSchema
>;
export type ListPlatformSubscriptionsQuery = z.infer<typeof listPlatformSubscriptionsQuerySchema>;
export type PlatformSubscriptionWorkQueueCountsDto = z.infer<
  typeof platformSubscriptionWorkQueueCountsSchema
>;
export type PlatformSubscriptionWorkQueueDto = z.infer<typeof platformSubscriptionWorkQueueSchema>;
