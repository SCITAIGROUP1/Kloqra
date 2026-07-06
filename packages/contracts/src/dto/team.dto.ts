import { z } from "zod";
import { listPaginationQuerySchema } from "../pagination";
import { teamMemberRoleSchema } from "../tenant-rbac";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const teamMemberSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email(),
  role: teamMemberRoleSchema,
  isActive: z.boolean()
});

export const updateTeamMemberSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: teamMemberRoleSchema.optional()
  })
  .refine((value) => value.isActive !== undefined || value.role !== undefined, {
    message: "At least one of isActive or role is required"
  });

export const addTeamMemberSchema = z.object({
  userId: uuidSchema
});

export const teamSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  members: z.array(teamMemberSchema)
});

export const createTeamInviteSchema = z.object({
  email: z.string().email().optional()
});

export const teamInviteSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  token: z.string(),
  email: z.string().email().nullable(),
  inviteUrl: z.string().url(),
  expiresAt: isoDatetimeSchema,
  acceptedAt: isoDatetimeSchema.nullable()
});

export const teamInvitePreviewSchema = z.object({
  projectName: z.string(),
  workspaceName: z.string(),
  email: z.string().email().nullable(),
  expiresAt: isoDatetimeSchema,
  expired: z.boolean()
});

export const listProjectTeamQuerySchema = listPaginationQuerySchema.extend({
  role: teamMemberRoleSchema.optional()
});

export const projectTeamResponseSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  members: z.array(teamMemberSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type TeamMemberDto = z.infer<typeof teamMemberSchema>;
export type UpdateTeamMemberDto = z.infer<typeof updateTeamMemberSchema>;
export type AddTeamMemberDto = z.infer<typeof addTeamMemberSchema>;
export type TeamDto = z.infer<typeof teamSchema>;
export type ListProjectTeamQuery = z.infer<typeof listProjectTeamQuerySchema>;
export type ProjectTeamResponseDto = z.infer<typeof projectTeamResponseSchema>;
export type CreateTeamInviteDto = z.infer<typeof createTeamInviteSchema>;
export type TeamInviteDto = z.infer<typeof teamInviteSchema>;
export type TeamInvitePreviewDto = z.infer<typeof teamInvitePreviewSchema>;

// Back-compat aliases (prefer Team* names in new code)
export const projectMemberSchema = teamMemberSchema;
export const createProjectInviteSchema = createTeamInviteSchema;
export const projectInviteSchema = teamInviteSchema;
export const projectInvitePreviewSchema = teamInvitePreviewSchema;
export type ProjectMemberDto = TeamMemberDto;
export type CreateProjectInviteDto = CreateTeamInviteDto;
export type ProjectInviteDto = TeamInviteDto;
export type ProjectInvitePreviewDto = TeamInvitePreviewDto;
