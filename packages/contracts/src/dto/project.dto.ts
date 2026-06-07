import { z } from "zod";
import { PROJECT_COLORS } from "../project-colors";
import { timesheetApprovalPeriodSchema } from "../workspace-settings";
import { uuidSchema } from "./common.dto";

export const projectColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #6366f1")
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
  clientName: z.string().max(200).nullable(),
  budgetHours: z.number().positive().nullable(),
  isActive: z.boolean(),
  timesheetApprovalEnabled: z.boolean(),
  timesheetApprovalPeriod: timesheetApprovalPeriodSchema.nullable()
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

export const listProjectsQuerySchema = z.object({
  isActive: z.coerce.boolean().optional()
});

export type ProjectDto = z.infer<typeof projectSchema>;
export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
