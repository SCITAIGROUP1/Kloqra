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
  role: workspaceRoleSchema
});

export const switchWorkspaceSchema = z.object({
  workspaceId: uuidSchema
});

export const workspaceMemberSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  userId: uuidSchema,
  role: workspaceRoleSchema,
  userName: z.string(),
  userEmail: z.string().email()
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: workspaceRoleSchema.default("MEMBER"),
  name: z.string().min(1).max(120).optional()
});

export const emailSkipReasonSchema = z.enum(["smtp_unconfigured", "send_failed"]);

export const inviteMemberResponseSchema = z.object({
  member: workspaceMemberSchema,
  userCreated: z.boolean(),
  emailSent: z.boolean(),
  emailSkipReason: emailSkipReasonSchema.optional()
});

export const updateWorkspaceMemberSchema = z.object({
  role: workspaceRoleSchema
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  settings: z.record(z.unknown()).optional()
});

export const teamMemberOverviewSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email(),
  role: workspaceRoleSchema,
  status: teamMemberStatusSchema,
  projectCount: z.number().int().nonnegative(),
  weekHours: z.number(),
  lastActiveAt: isoDatetimeSchema.nullable(),
  isTrackingNow: z.boolean(),
  memberSince: isoDatetimeSchema
});

export const teamMembersOverviewSummarySchema = z.object({
  totalMembers: z.number().int().nonnegative(),
  activeMembers: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  totalWeekHours: z.number()
});

export const teamMembersOverviewQuerySchema = listPaginationQuerySchema;

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
export type WorkspaceMemberDto = z.infer<typeof workspaceMemberSchema>;
export type TeamMemberStatus = z.infer<typeof teamMemberStatusSchema>;
export type TeamMemberOverviewDto = z.infer<typeof teamMemberOverviewSchema>;
export type TeamMembersOverviewSummaryDto = z.infer<typeof teamMembersOverviewSummarySchema>;
export type TeamMembersOverviewDto = z.infer<typeof teamMembersOverviewSchema>;
export type TeamMembersOverviewQuery = z.infer<typeof teamMembersOverviewQuerySchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type InviteMemberResponseDto = z.infer<typeof inviteMemberResponseSchema>;
export type EmailSkipReason = z.infer<typeof emailSkipReasonSchema>;
export type UpdateWorkspaceMemberDto = z.infer<typeof updateWorkspaceMemberSchema>;
export type SwitchWorkspaceDto = z.infer<typeof switchWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
