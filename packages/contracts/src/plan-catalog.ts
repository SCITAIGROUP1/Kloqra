import { z } from "zod";
import { slugSchema, uuidSchema } from "./dto/common.dto";
import { planLimitsSchema, type PlanLimits } from "./tenant-rbac";

/** Stable catalog slugs — seeded in F09. */
export const PLAN_SLUGS = {
  PILOT: "pilot",
  STARTER: "starter",
  PRO: "pro"
} as const;

export type PlanSlug = (typeof PLAN_SLUGS)[keyof typeof PLAN_SLUGS];

/** Placeholder tier caps (D11 numbers provisional until pricing research). */
export const DEFAULT_PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  [PLAN_SLUGS.PILOT]: { maxWorkspaces: 25, maxSeats: 100, maxReportingApiKeys: 50 },
  [PLAN_SLUGS.STARTER]: { maxWorkspaces: 3, maxSeats: 10, maxReportingApiKeys: 5 },
  [PLAN_SLUGS.PRO]: { maxWorkspaces: 10, maxSeats: 50, maxReportingApiKeys: 25 }
};

/** Stable UUIDs for seed + migration backfill. */
export const PLAN_IDS: Record<PlanSlug, string> = {
  [PLAN_SLUGS.PILOT]: "00000000-0000-4000-8000-000000000001",
  [PLAN_SLUGS.STARTER]: "00000000-0000-4000-8000-000000000002",
  [PLAN_SLUGS.PRO]: "00000000-0000-4000-8000-000000000003"
};

export const planSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  limits: planLimitsSchema,
  isPublic: z.boolean()
});

export type PlanDto = z.infer<typeof planSchema>;

export const publicPlanSchema = planSchema.pick({
  id: true,
  name: true,
  slug: true,
  limits: true
});

export const publicPlanListSchema = z.object({
  items: z.array(publicPlanSchema)
});

export type PublicPlanDto = z.infer<typeof publicPlanSchema>;
export type PublicPlanListDto = z.infer<typeof publicPlanListSchema>;

export const planLimitKindSchema = z.enum(["maxWorkspaces", "maxSeats", "maxReportingApiKeys"]);

export const planLimitExceededDetailsSchema = z.object({
  limit: planLimitKindSchema,
  current: z.number().int().nonnegative(),
  max: z.number().int().positive()
});

export type PlanLimitExceededDetails = z.infer<typeof planLimitExceededDetailsSchema>;

/** Merge plan limits with optional enterprise override (subscription.limits_override). */
export function resolveEffectiveLimits(
  planLimits: PlanLimits,
  limitsOverride?: Partial<PlanLimits> | null
): PlanLimits {
  if (!limitsOverride) return { ...planLimits };
  return {
    ...planLimits,
    ...limitsOverride
  };
}
