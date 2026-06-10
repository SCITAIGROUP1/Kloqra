import { z } from "zod";
import { timesheetApprovalPeriodSchema } from "../workspace-settings";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const timesheetPeriodStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);

export const timesheetPeriodSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  workspaceId: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string().optional(),
  periodStart: isoDatetimeSchema,
  periodEnd: isoDatetimeSchema,
  approvalPeriod: timesheetApprovalPeriodSchema,
  status: timesheetPeriodStatusSchema,
  note: z.string().nullable(),
  reviewNote: z.string().nullable(),
  reviewedBy: uuidSchema.nullable(),
  submittedAt: isoDatetimeSchema.nullable(),
  reviewedAt: isoDatetimeSchema.nullable()
});

export const submitTimesheetSchema = z.object({
  date: z.string(),
  projectId: uuidSchema,
  note: z.string().max(2000).optional()
});

export const timesheetStatusQuerySchema = z.object({
  date: z.string().optional(),
  projectId: uuidSchema
});

export const timesheetSubmissionsScopeSchema = z.enum(["logged", "assigned"]);

export const timesheetSubmissionsQuerySchema = z.object({
  date: z.string().optional(),
  scope: timesheetSubmissionsScopeSchema.optional().default("logged")
});

export const pendingTimesheetSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string(),
  projectId: uuidSchema,
  projectName: z.string(),
  periodStart: isoDatetimeSchema,
  periodEnd: isoDatetimeSchema,
  approvalPeriod: timesheetApprovalPeriodSchema,
  status: timesheetPeriodStatusSchema,
  note: z.string().nullable(),
  submittedAt: isoDatetimeSchema.nullable(),
  totalHours: z.number()
});

export const listTimesheetSubmissionsResponseSchema = z.object({
  items: z.array(timesheetPeriodSchema)
});

export const listPendingTimesheetsResponseSchema = z.object({
  items: z.array(pendingTimesheetSchema)
});

export type TimesheetPeriodStatus = z.infer<typeof timesheetPeriodStatusSchema>;
export type TimesheetPeriodDto = z.infer<typeof timesheetPeriodSchema>;
export type SubmitTimesheetDto = z.infer<typeof submitTimesheetSchema>;
export type PendingTimesheetDto = z.infer<typeof pendingTimesheetSchema>;
export type ListTimesheetSubmissionsResponseDto = z.infer<
  typeof listTimesheetSubmissionsResponseSchema
>;
