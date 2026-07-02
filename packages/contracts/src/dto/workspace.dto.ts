import { z } from "zod";
import { listPaginationQuerySchema } from "../pagination";
import { isoDatetimeSchema, slugSchema, uuidSchema, workspaceRoleSchema } from "./common.dto";

export const teamMemberStatusSchema = z.enum(["active", "inactive"]);

export const workspaceSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: slugSchema,
  settings: z.record(z.unknown()).optional()
});

export const workspaceWithRoleSchema = workspaceSchema.extend({
  role: workspaceRoleSchema,
  managedProjectIds: z.array(uuidSchema).optional()
});

/** Slim workspace row for switcher — omits slug and settings blob. */
export const workspaceListItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  role: workspaceRoleSchema,
  /** Present when role is MEMBER and user leads one or more projects in this workspace. */
  managedProjectIds: z.array(uuidSchema).optional()
});

export const switchWorkspaceSchema = z.object({
  workspaceId: uuidSchema
});

export const workspaceMemberSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  userId: uuidSchema,
  role: workspaceRoleSchema,
  isActive: z.boolean(),
  userName: z.string(),
  userEmail: z.string().email()
});

/** Slim member row for pickers — omits workspaceId and role. */
export const workspaceMemberPickerSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email()
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema.optional()
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: workspaceRoleSchema.default("MEMBER"),
  name: z.string().trim().min(1).max(120)
});

export const emailSkipReasonSchema = z.enum(["smtp_unconfigured", "send_failed"]);

export const inviteMemberResponseSchema = z.object({
  member: workspaceMemberSchema,
  userCreated: z.boolean(),
  emailSent: z.boolean(),
  emailSkipReason: emailSkipReasonSchema.optional()
});

export const bulkInviteMemberSchema = z.object({
  members: z.array(inviteMemberSchema).min(1).max(500)
});

export const bulkInviteResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  enqueuedCount: z.number()
});

export const memberEmailDeliverySchema = z.object({
  emailSent: z.boolean(),
  emailSkipReason: emailSkipReasonSchema.optional(),
  emailFailureMessage: z.string().max(240).optional()
});

export const updateWorkspaceMemberSchema = z
  .object({
    role: workspaceRoleSchema.optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: "At least one of role or isActive is required"
  });

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  settings: z.record(z.unknown()).optional()
});

export const teamMemberOverviewSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email(),
  role: workspaceRoleSchema,
  pendingCredentials: z.boolean().optional(),
  isActive: z.boolean(),
  status: teamMemberStatusSchema,
  projectCount: z.number().int().nonnegative(),
  weekHours: z.number(),
  lastActiveAt: isoDatetimeSchema.nullable(),
  isTrackingNow: z.boolean()
});

export const teamMembersOverviewSummarySchema = z.object({
  totalMembers: z.number().int().nonnegative(),
  activeMembers: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  totalWeekHours: z.number()
});

export const teamMembersOverviewQuerySchema = listPaginationQuerySchema.extend({
  role: workspaceRoleSchema.optional(),
  status: teamMemberStatusSchema.optional(),
  membershipActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true"))
});

export const teamMembersOverviewSchema = z.object({
  members: z.array(teamMemberOverviewSchema),
  summary: teamMembersOverviewSummarySchema,
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type WorkspaceDto = z.infer<typeof workspaceSchema>;
export type WorkspaceWithRoleDto = z.infer<typeof workspaceWithRoleSchema>;
export type WorkspaceListItemDto = z.infer<typeof workspaceListItemSchema>;
export type WorkspaceMemberDto = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceMemberPickerDto = z.infer<typeof workspaceMemberPickerSchema>;
export type TeamMemberStatus = z.infer<typeof teamMemberStatusSchema>;
export type TeamMemberOverviewDto = z.infer<typeof teamMemberOverviewSchema>;
export type TeamMembersOverviewSummaryDto = z.infer<typeof teamMembersOverviewSummarySchema>;
export type TeamMembersOverviewDto = z.infer<typeof teamMembersOverviewSchema>;
export type TeamMembersOverviewQuery = z.infer<typeof teamMembersOverviewQuerySchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type InviteMemberResponseDto = z.infer<typeof inviteMemberResponseSchema>;
export type MemberEmailDeliveryDto = z.infer<typeof memberEmailDeliverySchema>;
export type EmailSkipReason = z.infer<typeof emailSkipReasonSchema>;
export type UpdateWorkspaceMemberDto = z.infer<typeof updateWorkspaceMemberSchema>;
export type SwitchWorkspaceDto = z.infer<typeof switchWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
