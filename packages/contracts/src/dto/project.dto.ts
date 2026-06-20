import { z } from "zod";
import { createPaginatedListResponseSchema, listPaginationQuerySchema } from "../pagination";
import { PROJECT_COLORS } from "../project-colors";
import { timesheetApprovalPeriodSchema } from "../workspace-settings";
import { uuidSchema } from "./common.dto";

export const projectColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #236bfe")
  .refine((c) => PROJECT_COLORS.includes(c as (typeof PROJECT_COLORS)[number]), {
    message: "Color must be from the project palette"
  });

export const projectSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  /** Populated on read so members can tell projects apart across workspaces */
  workspaceName: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(200),
  color: projectColorSchema,
  /** Member's personal display color override for this project (current user only). */
  myColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  clientName: z.string().max(200).nullable(),
  budgetHours: z.number().positive().nullable(),
  isActive: z.boolean(),
  timesheetApprovalEnabled: z.boolean().optional(),
  timesheetApprovalPeriod: timesheetApprovalPeriodSchema.nullable(),
  createdAt: z.string().optional()
});

/** Slim project row for lists and dropdowns. */
export const projectListItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200),
  color: projectColorSchema,
  clientName: z.string().max(200).nullable(),
  /** All-time tracked seconds across every task on the project. */
  totalTrackedSec: z.number().int().nonnegative(),
  isActive: z.boolean(),
  timesheetApprovalEnabled: z.boolean().optional(),
  workspaceId: uuidSchema.optional(),
  workspaceName: z.string().min(1).max(120).optional(),
  myColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional()
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  color: projectColorSchema.optional(),
  clientName: z.string().max(200).optional(),
  budgetHours: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  timesheetApprovalEnabled: z.boolean().optional(),
  timesheetApprovalPeriod: timesheetApprovalPeriodSchema.optional()
});

export const updateProjectSchema = createProjectSchema.partial();

export const listProjectsQuerySchema = listPaginationQuerySchema.extend({
  isActive: z.coerce.boolean().optional()
});

export const listProjectsResponseSchema = createPaginatedListResponseSchema(projectListItemSchema);

export type ProjectDto = z.infer<typeof projectSchema>;
export type ProjectListItemDto = z.infer<typeof projectListItemSchema>;
export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;
