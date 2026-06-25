import { z } from "zod";
import { listPaginationQuerySchema } from "../pagination";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";
import { teamMemberStatusSchema } from "./workspace.dto";

export const workspaceAdminOverviewSchema = z.object({
  workspaceMemberId: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email(),
  workspaceId: uuidSchema,
  workspaceName: z.string(),
  isActive: z.boolean(),
  pendingCredentials: z.boolean().optional(),
  status: teamMemberStatusSchema,
  weekHours: z.number(),
  lastActiveAt: isoDatetimeSchema.nullable(),
  isTrackingNow: z.boolean()
});

export const workspaceAdminsOverviewSummarySchema = z.object({
  totalAdmins: z.number().int().nonnegative(),
  activeAdmins: z.number().int().nonnegative(),
  workspacesWithAdmins: z.number().int().nonnegative()
});

export const workspaceAdminsOverviewQuerySchema = listPaginationQuerySchema.extend({
  workspaceIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return typeof val === "string" ? val.split(",") : val;
    }),
  status: teamMemberStatusSchema.optional(),
  membershipActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true"))
});

export const workspaceAdminsOverviewSchema = z.object({
  admins: z.array(workspaceAdminOverviewSchema),
  summary: workspaceAdminsOverviewSummarySchema,
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type WorkspaceAdminOverviewDto = z.infer<typeof workspaceAdminOverviewSchema>;
export type WorkspaceAdminsOverviewSummaryDto = z.infer<
  typeof workspaceAdminsOverviewSummarySchema
>;
export type WorkspaceAdminsOverviewDto = z.infer<typeof workspaceAdminsOverviewSchema>;
export type WorkspaceAdminsOverviewQuery = z.infer<typeof workspaceAdminsOverviewQuerySchema>;
