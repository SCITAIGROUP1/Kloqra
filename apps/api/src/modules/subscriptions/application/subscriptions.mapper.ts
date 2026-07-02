import {
  planLimitsSchema,
  resolveEffectiveLimits,
  type PlanLimits,
  type TenantSubscriptionDto
} from "@kloqra/contracts";
import { resolveBillingAlert } from "./billing-alert.util";
import { resolveBillingMode } from "./billing-mode.util";

export type SubscriptionWithPlan = {
  tenantId: string;
  planId: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  limitsOverride: unknown;
  stripeCustomerId: string | null;
  plan: {
    id: string;
    name: string;
    limits: unknown;
  };
};

function parsePlanLimits(raw: unknown): PlanLimits {
  const parsed = planLimitsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Plan limits configuration is invalid");
  }
  return parsed.data;
}

function parseLimitsOverride(raw: unknown): Partial<PlanLimits> | null {
  if (raw === null || raw === undefined) return null;
  const parsed = planLimitsSchema.partial().safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export function toSubscriptionDto(row: SubscriptionWithPlan): TenantSubscriptionDto {
  const planLimits = parsePlanLimits(row.plan.limits);
  const limitsOverride = parseLimitsOverride(row.limitsOverride);
  return {
    tenantId: row.tenantId,
    planId: row.planId,
    planName: row.plan.name,
    status: row.status as TenantSubscriptionDto["status"],
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    limits: resolveEffectiveLimits(planLimits, limitsOverride),
    stripeCustomerId: row.stripeCustomerId,
    billingAlert: resolveBillingAlert({
      status: row.status,
      trialEndsAt: row.trialEndsAt
    }),
    billingMode: resolveBillingMode()
  };
}
