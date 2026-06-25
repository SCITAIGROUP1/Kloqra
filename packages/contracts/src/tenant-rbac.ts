import { z } from "zod";

/** Kloqra staff — `apps/platform-admin` only. */
export const platformRoleSchema = z.enum(["SUPERADMIN", "SUPPORT"]);

/** Organization purchaser — one row per user globally (D08). */
export const tenantMemberRoleSchema = z.enum(["OWNER", "ADMIN"]);

/** Project-scoped PM — F17; same user may be PROJECT_MANAGER on multiple projects. */
export const teamMemberRoleSchema = z.enum(["PROJECT_MANAGER", "MEMBER"]);

export const tenantStatusSchema = z.enum(["pending_setup", "active", "suspended", "churned"]);

export const subscriptionStatusSchema = z.enum([
  "trial",
  "active",
  "past_due",
  "suspended",
  "canceled"
]);

export const billingAlertSchema = z.enum(["past_due", "trial_ending"]).nullable();

/** Plan caps — workspace/seat numbers filled per tier (D11 deferred). */
export const planLimitsSchema = z.object({
  maxWorkspaces: z.number().int().positive(),
  maxSeats: z.number().int().positive(),
  maxReportingApiKeys: z.number().int().positive(),
  maxProjects: z.number().int().positive().optional(),
  features: z.array(z.string()).optional()
});

export type PlatformRole = z.infer<typeof platformRoleSchema>;
export type TenantMemberRole = z.infer<typeof tenantMemberRoleSchema>;
export type TeamMemberRole = z.infer<typeof teamMemberRoleSchema>;
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type PlanLimits = z.infer<typeof planLimitsSchema>;
