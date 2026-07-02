import { z } from "zod";
import { listPaginationQuerySchema } from "../pagination";
import { isoDatetimeSchema, uuidSchema, workspaceRoleSchema } from "./common.dto";
import { teamMemberStatusSchema } from "./workspace.dto";

export const projectManagerLedProjectSchema = z.object({
  projectId: uuidSchema,
  projectName: z.string(),
  teamMemberId: uuidSchema,
  isActive: z.boolean(),
  projectIsActive: z.boolean()
});

export const projectManagerOverviewSchema = z.object({
  workspaceMemberId: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email(),
  workspaceRole: workspaceRoleSchema,
  isWorkspaceMemberActive: z.boolean(),
  managedProjects: z.array(projectManagerLedProjectSchema),
  managedProjectCount: z.number().int().nonnegative(),
  activeLedProjectCount: z.number().int().nonnegative(),
  status: teamMemberStatusSchema,
  weekHours: z.number(),
  lastActiveAt: isoDatetimeSchema.nullable(),
  isTrackingNow: z.boolean()
});

export const projectManagersOverviewSummarySchema = z.object({
  totalManagers: z.number().int().nonnegative(),
  activeManagers: z.number().int().nonnegative(),
  totalLedProjects: z.number().int().nonnegative()
});

export const projectManagersOverviewQuerySchema = listPaginationQuerySchema.extend({
  projectId: uuidSchema.optional(),
  status: teamMemberStatusSchema.optional(),
  membershipActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  assignmentActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true"))
});

export const projectManagersOverviewSchema = z.object({
  managers: z.array(projectManagerOverviewSchema),
  summary: projectManagersOverviewSummarySchema,
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type ProjectManagerLedProjectDto = z.infer<typeof projectManagerLedProjectSchema>;
export type ProjectManagerOverviewDto = z.infer<typeof projectManagerOverviewSchema>;
export type ProjectManagersOverviewSummaryDto = z.infer<
  typeof projectManagersOverviewSummarySchema
>;
export type ProjectManagersOverviewDto = z.infer<typeof projectManagersOverviewSchema>;
export type ProjectManagersOverviewQuery = z.infer<typeof projectManagersOverviewQuerySchema>;
