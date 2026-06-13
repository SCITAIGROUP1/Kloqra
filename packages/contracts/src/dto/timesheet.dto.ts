import { z } from "zod";
import { timesheetApprovalPeriodSchema } from "../workspace-settings";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const timesheetPeriodStatusSchema = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);

export const amendmentRequestStatusSchema = z.enum(["PENDING", "APPROVED", "DENIED"]);

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
  reviewedAt: isoDatetimeSchema.nullable(),
  amendmentPending: z.boolean().optional()
});

export const submitTimesheetSchema = z.object({
  date: z.string(),
  projectId: uuidSchema,
  note: z.string().max(2000).optional(),
  confirmCascade: z.boolean().optional()
});

export const timesheetSubmitPreviewQuerySchema = z.object({
  date: z.string().optional(),
  projectId: uuidSchema
});

export const cascadePeriodPreviewSchema = z.object({
  periodStart: isoDatetimeSchema,
  periodEnd: isoDatetimeSchema,
  approvalPeriod: timesheetApprovalPeriodSchema,
  periodLabel: z.string(),
  totalHours: z.number()
});

export const timesheetSubmitPreviewResponseSchema = z.object({
  targetPeriod: timesheetPeriodSchema,
  cascadedPeriods: z.array(cascadePeriodPreviewSchema),
  blockedReason: z.string().optional(),
  blockedPeriodLabel: z.string().optional()
});

export const submitTimesheetResponseSchema = z.object({
  period: timesheetPeriodSchema,
  cascadedPeriodIds: z.array(uuidSchema),
  cascadedCount: z.number().int().nonnegative()
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
  totalHours: z.number(),
  cascadedCount: z.number().int().nonnegative().optional(),
  amendmentPending: z.boolean().optional()
});

export const timesheetApprovalsFilterQuerySchema = z.object({
  projectId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export const pendingTimesheetQuerySchema = timesheetApprovalsFilterQuerySchema;

export const amendmentListQuerySchema = timesheetApprovalsFilterQuerySchema;

export const missingTimesheetQuerySchema = timesheetApprovalsFilterQuerySchema.extend({
  date: z.string().optional()
});

export const missingTimesheetSchema = z.object({
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string(),
  projectId: uuidSchema,
  projectName: z.string(),
  periodStart: isoDatetimeSchema,
  periodEnd: isoDatetimeSchema,
  approvalPeriod: timesheetApprovalPeriodSchema,
  periodLabel: z.string(),
  totalHours: z.number(),
  lastRemindedAt: isoDatetimeSchema.nullable()
});

export const remindTimesheetSchema = z.object({
  userId: uuidSchema,
  projectId: uuidSchema,
  date: z.string(),
  message: z.string().max(300).optional()
});

export const createAmendmentRequestSchema = z.object({
  reason: z.string().min(1).max(500)
});

export const reviewAmendmentSchema = z.object({
  adminNote: z.string().max(500).optional()
});

export const timesheetAmendmentSchema = z.object({
  id: uuidSchema,
  periodId: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string(),
  workspaceId: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  periodStart: isoDatetimeSchema,
  periodEnd: isoDatetimeSchema,
  periodLabel: z.string(),
  reason: z.string(),
  status: amendmentRequestStatusSchema,
  adminNote: z.string().nullable(),
  reviewedBy: uuidSchema.nullable(),
  reviewedAt: isoDatetimeSchema.nullable(),
  createdAt: isoDatetimeSchema
});

export const listTimesheetSubmissionsResponseSchema = z.object({
  items: z.array(timesheetPeriodSchema)
});

export const listPendingTimesheetsResponseSchema = z.object({
  items: z.array(pendingTimesheetSchema)
});

export const listMissingTimesheetsResponseSchema = z.object({
  items: z.array(missingTimesheetSchema)
});

export const listAmendmentRequestsResponseSchema = z.object({
  items: z.array(timesheetAmendmentSchema)
});

export type TimesheetPeriodStatus = z.infer<typeof timesheetPeriodStatusSchema>;
export type AmendmentRequestStatus = z.infer<typeof amendmentRequestStatusSchema>;
export type TimesheetPeriodDto = z.infer<typeof timesheetPeriodSchema>;
export type SubmitTimesheetDto = z.infer<typeof submitTimesheetSchema>;
export type TimesheetSubmitPreviewDto = z.infer<typeof timesheetSubmitPreviewResponseSchema>;
export type SubmitTimesheetResponseDto = z.infer<typeof submitTimesheetResponseSchema>;
export type PendingTimesheetDto = z.infer<typeof pendingTimesheetSchema>;
export type TimesheetApprovalsFilterQuery = z.infer<typeof timesheetApprovalsFilterQuerySchema>;
export type MissingTimesheetDto = z.infer<typeof missingTimesheetSchema>;
export type TimesheetAmendmentDto = z.infer<typeof timesheetAmendmentSchema>;
export type ListTimesheetSubmissionsResponseDto = z.infer<
  typeof listTimesheetSubmissionsResponseSchema
>;
export type ListPendingTimesheetsResponseDto = z.infer<typeof listPendingTimesheetsResponseSchema>;
export type ListMissingTimesheetsResponseDto = z.infer<typeof listMissingTimesheetsResponseSchema>;
export type ListAmendmentRequestsResponseDto = z.infer<typeof listAmendmentRequestsResponseSchema>;
