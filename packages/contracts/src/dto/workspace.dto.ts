import { z } from "zod";
import { slugSchema, uuidSchema, workspaceRoleSchema } from "./common.dto";

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
  role: workspaceRoleSchema.default("MEMBER")
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  settings: z.record(z.unknown()).optional()
});

export type WorkspaceDto = z.infer<typeof workspaceSchema>;
export type WorkspaceWithRoleDto = z.infer<typeof workspaceWithRoleSchema>;
export type WorkspaceMemberDto = z.infer<typeof workspaceMemberSchema>;
export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;
export type SwitchWorkspaceDto = z.infer<typeof switchWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
