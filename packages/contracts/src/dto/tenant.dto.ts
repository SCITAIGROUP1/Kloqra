import { z } from "zod";
import {
  billingAlertSchema,
  planLimitsSchema,
  subscriptionStatusSchema,
  tenantMemberRoleSchema,
  tenantStatusSchema
} from "../tenant-rbac";
import { isoDatetimeSchema, slugSchema, uuidSchema } from "./common.dto";
import { billingModeSchema } from "./subscription.dto";
import { inviteMemberResponseSchema } from "./workspace.dto";

export const tenantSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  status: tenantStatusSchema,
  settings: z.record(z.unknown()).optional(),
  createdAt: isoDatetimeSchema
});

/** Public org lookup by slug (login branding only). */
export const publicTenantSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120)
});

export const tenantMemberSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  userId: uuidSchema,
  role: tenantMemberRoleSchema,
  isActive: z.boolean(),
  userName: z.string(),
  userEmail: z.string().email()
});

export const tenantSubscriptionSchema = z.object({
  tenantId: uuidSchema,
  planId: uuidSchema,
  planName: z.string(),
  status: subscriptionStatusSchema,
  trialEndsAt: isoDatetimeSchema.nullable(),
  currentPeriodEnd: isoDatetimeSchema.nullable(),
  limits: planLimitsSchema,
  stripeCustomerId: z.string().nullable().optional(),
  billingAlert: billingAlertSchema.optional(),
  billingMode: billingModeSchema
});

export const tenantOverviewSchema = z.object({
  tenant: tenantSchema,
  subscription: tenantSubscriptionSchema,
  workspaceCount: z.number().int().nonnegative(),
  seatCount: z.number().int().nonnegative()
});

export const createTenantWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema.optional()
});

export const assignWorkspaceAdminSchema = z
  .object({
    userId: uuidSchema.optional(),
    email: z.string().email().optional(),
    name: z.string().min(1).max(120).optional()
  })
  .refine((value) => value.userId !== undefined || value.email !== undefined, {
    message: "userId or email is required"
  })
  .refine(
    (value) =>
      value.userId !== undefined || (value.email !== undefined && value.name !== undefined),
    { message: "name is required when inviting by email" }
  );

export const assignWorkspaceAdminResponseSchema = inviteMemberResponseSchema;

export const inviteTenantMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.literal("ADMIN")
});

export const updateTenantMemberSchema = z
  .object({
    role: tenantMemberRoleSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: "At least one field is required"
  });

export const inviteTenantMemberResponseSchema = z.object({
  member: tenantMemberSchema,
  userCreated: z.boolean(),
  temporaryPassword: z.string().optional()
});

export const updateTenantCurrentSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: slugSchema.optional()
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "At least one field is required"
  });

export type TenantDto = z.infer<typeof tenantSchema>;
export type PublicTenantDto = z.infer<typeof publicTenantSchema>;
export type TenantMemberDto = z.infer<typeof tenantMemberSchema>;
export type TenantSubscriptionDto = z.infer<typeof tenantSubscriptionSchema>;
export type TenantOverviewDto = z.infer<typeof tenantOverviewSchema>;
export type CreateTenantWorkspaceDto = z.infer<typeof createTenantWorkspaceSchema>;
export type AssignWorkspaceAdminDto = z.infer<typeof assignWorkspaceAdminSchema>;
export type AssignWorkspaceAdminResponseDto = z.infer<typeof assignWorkspaceAdminResponseSchema>;
export type InviteTenantMemberDto = z.infer<typeof inviteTenantMemberSchema>;
export type UpdateTenantMemberDto = z.infer<typeof updateTenantMemberSchema>;
export type UpdateTenantCurrentDto = z.infer<typeof updateTenantCurrentSchema>;
export type InviteTenantMemberResponseDto = z.infer<typeof inviteTenantMemberResponseSchema>;
