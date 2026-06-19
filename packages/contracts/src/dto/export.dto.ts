import { z } from "zod";
import { assertMaxDateRange, isoDatetimeSchema, uuidSchema } from "./common.dto";

export const exportReportTypeSchema = z.enum([
  "time_entries",
  "daily_summary",
  "by_project",
  "by_member",
  "by_client",
  "invoice",
  "by_task",
  "by_category",
  "weekly_summary",
  "users_without_time",
  "budget_vs_actual",
  "utilization",
  "member_daily_total",
  "member_project_breakdown",
  "missing_days",
  "overtime_summary",
  "hours_by_source",
  "timesheet_approval_status"
]);

/** One grouping dimension (combine up to 5 in order). */
export const exportGroupByDimensionSchema = z.enum([
  "project",
  "member",
  "task",
  "category",
  "client",
  "day",
  "week"
]);

export type ExportGroupByDimension = z.infer<typeof exportGroupByDimensionSchema>;

/** @deprecated Single value from older presets; normalized to a dimension array. */
export const exportGroupByLegacySchema = z.enum(["none", ...exportGroupByDimensionSchema.options]);

export type ExportGroupByLegacy = z.infer<typeof exportGroupByLegacySchema>;

function normalizeExportGroupBy(val: unknown): ExportGroupByDimension[] {
  if (val == null || val === "none") return [];
  if (typeof val === "string") {
    const parsed = exportGroupByDimensionSchema.safeParse(val);
    return parsed.success ? [parsed.data] : [];
  }
  if (Array.isArray(val)) {
    const out: ExportGroupByDimension[] = [];
    for (const item of val) {
      if (item === "none") continue;
      const parsed = exportGroupByDimensionSchema.safeParse(item);
      if (parsed.success && !out.includes(parsed.data)) out.push(parsed.data);
    }
    return out.slice(0, 5);
  }
  return [];
}

/** Ordered dimensions for sort keys and rollup sheet suggestions (empty = manual). */
export const exportGroupByListSchema = z.preprocess(
  normalizeExportGroupBy,
  z.array(exportGroupByDimensionSchema).max(5).default([])
);

export type ExportGroupBy = ExportGroupByDimension[];

/** How detail rows are packaged into workbook tabs / files (admin). */
export const exportSheetLayoutSchema = z.enum([
  "standard",
  "tabs_per_member",
  "tabs_per_project",
  "tabs_per_client",
  "tabs_per_category"
]);

export type ExportSheetLayout = z.infer<typeof exportSheetLayoutSchema>;

export type ExportReportType = z.infer<typeof exportReportTypeSchema>;

export const exportBillableFilterSchema = z.enum(["all", "billable", "non_billable"]);

export type ExportBillableFilter = z.infer<typeof exportBillableFilterSchema>;

export const exportFormatSchema = z.enum(["csv", "xlsx", "pdf"]);

export const TIME_ENTRIES_COLUMNS = [
  "workspace",
  "client",
  "project",
  "category",
  "task",
  "member",
  "email",
  "date",
  "start_time",
  "end_time",
  "hours",
  "billable",
  "rate",
  "amount",
  "description",
  "source"
] as const;

export const INVOICE_COLUMNS = [
  "client",
  "project",
  "category",
  "task",
  "date",
  "hours",
  "rate",
  "amount",
  "description"
] as const;

export const DAILY_SUMMARY_COLUMNS = [
  "date",
  "member",
  "email",
  "client",
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const WEEKLY_SUMMARY_COLUMNS = [
  "week_start",
  "week_label",
  "member",
  "email",
  "client",
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const BY_PROJECT_COLUMNS = [
  "project",
  "client",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount",
  "active_members"
] as const;

export const BY_MEMBER_COLUMNS = [
  "member",
  "email",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const BY_CLIENT_COLUMNS = [
  "client",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount",
  "active_projects"
] as const;

export const BY_TASK_COLUMNS = [
  "task",
  "category",
  "project",
  "client",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const BY_CATEGORY_COLUMNS = [
  "category",
  "project",
  "client",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount",
  "active_tasks"
] as const;

export const USERS_WITHOUT_TIME_COLUMNS = [
  "member",
  "email",
  "last_log_date",
  "days_without_logs"
] as const;

export const BUDGET_VS_ACTUAL_COLUMNS = [
  "project",
  "client",
  "budget_hours",
  "logged_hours",
  "remaining_hours",
  "percent_used",
  "billable_amount"
] as const;

export const UTILIZATION_COLUMNS = [
  "week_start",
  "week_label",
  "member",
  "email",
  "logged_hours",
  "expected_hours",
  "utilization_pct"
] as const;

export const MEMBER_DAILY_TOTAL_COLUMNS = [
  "date",
  "member",
  "email",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const MEMBER_PROJECT_BREAKDOWN_COLUMNS = [
  "member",
  "email",
  "project",
  "client",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const MISSING_DAYS_COLUMNS = ["member", "email", "date", "weekday"] as const;

export const OVERTIME_SUMMARY_COLUMNS = [
  "week_start",
  "week_label",
  "member",
  "email",
  "logged_hours",
  "expected_hours",
  "over_hours",
  "under_hours",
  "status"
] as const;

export const HOURS_BY_SOURCE_COLUMNS = [
  "member",
  "email",
  "timer_hours",
  "manual_hours",
  "total_hours"
] as const;

export const TIMESHEET_APPROVAL_STATUS_COLUMNS = [
  "member",
  "email",
  "project",
  "period_label",
  "status",
  "submitted_at",
  "reviewed_at",
  "review_note"
] as const;

export const EXPORT_COLUMN_LABELS: Record<ExportReportType, Record<string, string>> = {
  time_entries: {
    workspace: "Workspace",
    client: "Client",
    project: "Project",
    category: "Category",
    task: "Task",
    member: "Member",
    email: "Email",
    date: "Date",
    start_time: "Start",
    end_time: "End",
    hours: "Hours",
    billable: "Billable",
    rate: "Rate",
    amount: "Amount",
    description: "Description",
    source: "Source"
  },
  invoice: {
    client: "Client",
    project: "Project",
    category: "Category",
    task: "Task",
    date: "Date",
    hours: "Hours",
    rate: "Rate",
    amount: "Amount",
    description: "Description"
  },
  daily_summary: {
    date: "Date",
    member: "Member",
    email: "Email",
    client: "Client",
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  weekly_summary: {
    week_start: "Week start",
    week_label: "Week",
    member: "Member",
    email: "Email",
    client: "Client",
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  by_project: {
    project: "Project",
    client: "Client",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount",
    active_members: "Active members"
  },
  by_member: {
    member: "Member",
    email: "Email",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  by_client: {
    client: "Client",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount",
    active_projects: "Active projects"
  },
  by_task: {
    task: "Task",
    category: "Category",
    project: "Project",
    client: "Client",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  by_category: {
    category: "Category",
    project: "Project",
    client: "Client",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount",
    active_tasks: "Active tasks"
  },
  users_without_time: {
    member: "Member",
    email: "Email",
    last_log_date: "Last log date",
    days_without_logs: "Days without logs in range"
  },
  budget_vs_actual: {
    project: "Project",
    client: "Client",
    budget_hours: "Budget hours",
    logged_hours: "Logged hours",
    remaining_hours: "Remaining hours",
    percent_used: "Percent used",
    billable_amount: "Billable amount"
  },
  utilization: {
    week_start: "Week start",
    week_label: "Week",
    member: "Member",
    email: "Email",
    logged_hours: "Logged hours",
    expected_hours: "Expected hours",
    utilization_pct: "Utilization %"
  },
  member_daily_total: {
    date: "Date",
    member: "Member",
    email: "Email",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  member_project_breakdown: {
    member: "Member",
    email: "Email",
    project: "Project",
    client: "Client",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  missing_days: {
    member: "Member",
    email: "Email",
    date: "Date",
    weekday: "Weekday"
  },
  overtime_summary: {
    week_start: "Week start",
    week_label: "Week",
    member: "Member",
    email: "Email",
    logged_hours: "Logged hours",
    expected_hours: "Expected hours",
    over_hours: "Over hours",
    under_hours: "Under hours",
    status: "Status"
  },
  hours_by_source: {
    member: "Member",
    email: "Email",
    timer_hours: "Timer hours",
    manual_hours: "Manual hours",
    total_hours: "Total hours"
  },
  timesheet_approval_status: {
    member: "Member",
    email: "Email",
    project: "Project",
    period_label: "Period",
    status: "Status",
    submitted_at: "Submitted",
    reviewed_at: "Reviewed",
    review_note: "Review note"
  }
};

export const DEFAULT_EXPORT_COLUMNS: Record<ExportReportType, readonly string[]> = {
  time_entries: TIME_ENTRIES_COLUMNS,
  invoice: INVOICE_COLUMNS,
  daily_summary: DAILY_SUMMARY_COLUMNS,
  weekly_summary: WEEKLY_SUMMARY_COLUMNS,
  by_project: BY_PROJECT_COLUMNS,
  by_member: BY_MEMBER_COLUMNS,
  by_client: BY_CLIENT_COLUMNS,
  by_task: BY_TASK_COLUMNS,
  by_category: BY_CATEGORY_COLUMNS,
  users_without_time: USERS_WITHOUT_TIME_COLUMNS,
  budget_vs_actual: BUDGET_VS_ACTUAL_COLUMNS,
  utilization: UTILIZATION_COLUMNS,
  member_daily_total: MEMBER_DAILY_TOTAL_COLUMNS,
  member_project_breakdown: MEMBER_PROJECT_BREAKDOWN_COLUMNS,
  missing_days: MISSING_DAYS_COLUMNS,
  overtime_summary: OVERTIME_SUMMARY_COLUMNS,
  hours_by_source: HOURS_BY_SOURCE_COLUMNS,
  timesheet_approval_status: TIMESHEET_APPROVAL_STATUS_COLUMNS
};

const columnsForReport = (report: ExportReportType) => {
  const allowed = new Set(Object.keys(EXPORT_COLUMN_LABELS[report]));
  return z
    .array(z.string())
    .min(1)
    .refine((cols) => cols.every((c) => allowed.has(c)), {
      message: `Invalid columns for ${report}`
    });
};

export const exportColumnsSchema = z
  .object({
    time_entries: columnsForReport("time_entries").optional(),
    invoice: columnsForReport("invoice").optional(),
    daily_summary: columnsForReport("daily_summary").optional(),
    weekly_summary: columnsForReport("weekly_summary").optional(),
    by_project: columnsForReport("by_project").optional(),
    by_member: columnsForReport("by_member").optional(),
    by_client: columnsForReport("by_client").optional(),
    by_task: columnsForReport("by_task").optional(),
    by_category: columnsForReport("by_category").optional(),
    users_without_time: columnsForReport("users_without_time").optional(),
    budget_vs_actual: columnsForReport("budget_vs_actual").optional(),
    utilization: columnsForReport("utilization").optional(),
    member_daily_total: columnsForReport("member_daily_total").optional(),
    member_project_breakdown: columnsForReport("member_project_breakdown").optional(),
    missing_days: columnsForReport("missing_days").optional(),
    overtime_summary: columnsForReport("overtime_summary").optional(),
    hours_by_source: columnsForReport("hours_by_source").optional(),
    timesheet_approval_status: columnsForReport("timesheet_approval_status").optional()
  })
  .optional();

function dedupeUuidList(primary: unknown, legacy: unknown): string[] {
  const fromArr = Array.isArray(primary)
    ? primary.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const legacyId = typeof legacy === "string" && legacy.length > 0 ? [legacy] : [];
  return [...new Set([...fromArr, ...legacyId])];
}

/** Merge legacy singular scope IDs into arrays for export filters. */
export function normalizeExportFiltersInput(val: unknown): unknown {
  if (!val || typeof val !== "object") return val;
  const input = { ...(val as Record<string, unknown>) };
  const projectIds = dedupeUuidList(input.projectIds, input.projectId);
  const userIds = dedupeUuidList(input.userIds, input.userId);
  if (projectIds.length) input.projectIds = projectIds;
  else delete input.projectIds;
  if (userIds.length) input.userIds = userIds;
  else delete input.userIds;
  if (typeof input.exportPurpose === "string") {
    const trimmed = input.exportPurpose.trim().slice(0, 48);
    if (trimmed) input.exportPurpose = trimmed;
    else delete input.exportPurpose;
  }
  return input;
}

const exportFiltersObjectSchema = z.object({
  from: isoDatetimeSchema,
  to: isoDatetimeSchema,
  projectId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  projectIds: z.array(uuidSchema).max(50).optional(),
  userIds: z.array(uuidSchema).max(100).optional(),
  categoryId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  teamOnly: z.boolean().optional(),
  billable: exportBillableFilterSchema.default("all"),
  groupBy: exportGroupByListSchema.default([]),
  sheetLayout: exportSheetLayoutSchema.default("standard"),
  exportPurpose: z.string().max(48).optional(),
  /** IANA timezone from the requesting user's preference (e.g. "America/New_York").
   *  When present, the server uses this for all date formatting instead of the
   *  workspace-level timezone, ensuring exported dates match what the user sees in the UI. */
  timezone: z.string().optional()
});

const withExportFiltersPreprocess = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(normalizeExportFiltersInput, schema);

export const exportFiltersBaseSchema = withExportFiltersPreprocess(exportFiltersObjectSchema);

export const exportFiltersSchema = exportFiltersBaseSchema.superRefine((v, ctx) =>
  assertMaxDateRange(v.from, v.to, ctx)
);

export type ExportFiltersDto = z.infer<typeof exportFiltersObjectSchema>;

export const exportBodySchema = withExportFiltersPreprocess(
  exportFiltersObjectSchema.extend({
    reportTypes: z.array(exportReportTypeSchema).min(1),
    format: exportFormatSchema,
    columns: exportColumnsSchema
  })
).superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export type ExportBodyDto = z.infer<typeof exportBodySchema>;

export const exportPreviewBodySchema = withExportFiltersPreprocess(
  exportFiltersObjectSchema.extend({
    reportTypes: z.array(exportReportTypeSchema).min(1),
    columns: exportColumnsSchema.optional(),
    sampleReportType: exportReportTypeSchema.optional()
  })
).superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export type ExportPreviewBodyDto = z.infer<typeof exportPreviewBodySchema>;

export const exportPreviewSheetSchema = z.object({
  name: z.string(),
  rowCount: z.number(),
  kind: z.enum(["person", "project", "client", "category", "report"])
});

export type ExportPreviewSheetDto = z.infer<typeof exportPreviewSheetSchema>;

export const EXPORT_LARGE_ROW_THRESHOLD = 10_000;

export const exportPreviewSampleRowsSchema = z.object({
  reportType: exportReportTypeSchema,
  sheetName: z.string().optional(),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.union([z.string(), z.number()])))
});

export type ExportPreviewSampleRowsDto = z.infer<typeof exportPreviewSampleRowsSchema>;

export const exportPreviewResponseSchema = z.object({
  counts: z.record(exportReportTypeSchema, z.number()),
  totalLogRows: z.number(),
  isEmpty: z.boolean(),
  sheets: z.array(exportPreviewSheetSchema),
  headline: z.string(),
  detail: z.string(),
  sampleRows: z.array(exportPreviewSampleRowsSchema).optional(),
  estimatedRowCount: z.number().optional(),
  warnLargeExport: z.boolean().optional()
});

export type ExportPreviewResponseDto = z.infer<typeof exportPreviewResponseSchema>;

/** @deprecated GET query — defaults only */
export const exportQuerySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    projectId: uuidSchema.optional(),
    userId: uuidSchema.optional(),
    format: z.enum(["csv", "pdf", "xlsx"])
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export type ExportQueryDto = z.infer<typeof exportQuerySchema>;

export const memberExportReportTypeSchema = z.enum([
  "time_entries",
  "daily_summary",
  "by_project",
  "by_category"
]);

export type MemberExportReportType = z.infer<typeof memberExportReportTypeSchema>;

export const MEMBER_TIME_ENTRIES_COLUMNS = [
  "project",
  "category",
  "task",
  "date",
  "start_time",
  "end_time",
  "hours",
  "billable",
  "rate",
  "amount",
  "description",
  "source"
] as const;

export const MEMBER_DAILY_SUMMARY_COLUMNS = [
  "date",
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours"
] as const;

export const MEMBER_BY_PROJECT_COLUMNS = [
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours"
] as const;

export const MEMBER_BY_CATEGORY_COLUMNS = [
  "category",
  "total_hours",
  "billable_hours",
  "non_billable_hours"
] as const;

export const MEMBER_EXPORT_COLUMN_LABELS: Record<MemberExportReportType, Record<string, string>> = {
  time_entries: {
    project: "Project",
    category: "Category",
    task: "Task",
    date: "Date",
    start_time: "Start",
    end_time: "End",
    hours: "Hours",
    billable: "Billable",
    rate: "Rate",
    amount: "Amount",
    description: "Description",
    source: "Source"
  },
  daily_summary: {
    date: "Date",
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours"
  },
  by_project: {
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours"
  },
  by_category: {
    category: "Category",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours"
  }
};

export const DEFAULT_MEMBER_EXPORT_COLUMNS: Record<MemberExportReportType, readonly string[]> = {
  time_entries: MEMBER_TIME_ENTRIES_COLUMNS,
  daily_summary: MEMBER_DAILY_SUMMARY_COLUMNS,
  by_project: MEMBER_BY_PROJECT_COLUMNS,
  by_category: MEMBER_BY_CATEGORY_COLUMNS
};

const memberColumnsForReport = (report: MemberExportReportType) => {
  const allowed = new Set(Object.keys(MEMBER_EXPORT_COLUMN_LABELS[report]));
  return z
    .array(z.string())
    .min(1)
    .refine((cols) => cols.every((c) => allowed.has(c)), {
      message: `Invalid columns for ${report}`
    });
};

export const memberExportColumnsSchema = z
  .object({
    time_entries: memberColumnsForReport("time_entries").optional(),
    daily_summary: memberColumnsForReport("daily_summary").optional(),
    by_project: memberColumnsForReport("by_project").optional(),
    by_category: memberColumnsForReport("by_category").optional()
  })
  .optional();

export const memberExportBodySchema = z
  .object({
    from: isoDatetimeSchema,
    to: isoDatetimeSchema,
    projectId: uuidSchema.optional(),
    categoryId: uuidSchema.optional(),
    taskId: uuidSchema.optional(),
    billable: exportBillableFilterSchema.default("all"),
    reportTypes: z.array(memberExportReportTypeSchema).min(1).default(["time_entries"]),
    format: exportFormatSchema,
    columns: memberExportColumnsSchema,
    /** IANA timezone from the requesting user's preference (e.g. "America/New_York").
     *  When present, the server uses this for all date formatting ensuring exported
     *  dates match what the user sees in the UI. */
    timezone: z.string().optional()
  })
  .superRefine((v, ctx) => assertMaxDateRange(v.from, v.to, ctx));

export type MemberExportBodyDto = z.infer<typeof memberExportBodySchema>;

export const exportScheduleFrequencySchema = z.enum(["daily", "weekly", "monthly"]);

export type ExportScheduleFrequency = z.infer<typeof exportScheduleFrequencySchema>;

export const createExportScheduleSchema = z.object({
  name: z.string().min(1).max(120),
  frequency: exportScheduleFrequencySchema,
  recipientEmails: z.array(z.string().email()).min(1),
  body: exportBodySchema,
  enabled: z.boolean().default(true)
});

export type CreateExportScheduleDto = z.infer<typeof createExportScheduleSchema>;

export const updateExportScheduleSchema = createExportScheduleSchema.partial();

export type UpdateExportScheduleDto = z.infer<typeof updateExportScheduleSchema>;

export const exportScheduleDtoSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  name: z.string(),
  frequency: exportScheduleFrequencySchema,
  recipientEmails: z.array(z.string().email()),
  body: exportBodySchema,
  enabled: z.boolean(),
  nextRunAt: isoDatetimeSchema,
  lastRunAt: isoDatetimeSchema.nullable(),
  lastRunStatus: z.string().nullable(),
  lastRunError: z.string().nullable(),
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export type ExportScheduleDto = z.infer<typeof exportScheduleDtoSchema>;

export const createExportPresetSchema = z.object({
  name: z.string().min(1).max(120),
  body: exportBodySchema
});

export type CreateExportPresetDto = z.infer<typeof createExportPresetSchema>;

export const exportPresetDtoSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  name: z.string(),
  body: exportBodySchema,
  createdAt: isoDatetimeSchema,
  updatedAt: isoDatetimeSchema
});

export type ExportPresetDto = z.infer<typeof exportPresetDtoSchema>;

export const createReportShareSchema = z.object({
  body: exportPreviewBodySchema,
  expiresInDays: z.number().int().min(1).max(90).default(30)
});

export type CreateReportShareDto = z.infer<typeof createReportShareSchema>;

export const reportShareDtoSchema = z.object({
  id: uuidSchema,
  token: z.string(),
  expiresAt: isoDatetimeSchema,
  shareUrl: z.string()
});

export type ReportShareDto = z.infer<typeof reportShareDtoSchema>;

export const publicReportShareViewSchema = z.object({
  workspaceName: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  billable: exportBillableFilterSchema,
  generatedAt: isoDatetimeSchema,
  reports: z.array(
    z.object({
      reportType: exportReportTypeSchema,
      rows: z.array(z.record(z.union([z.string(), z.number()])))
    })
  )
});

export type PublicReportShareViewDto = z.infer<typeof publicReportShareViewSchema>;

export function resolveExportColumns(
  report: ExportReportType,
  columns?: Partial<Record<ExportReportType, string[]>>
): string[] {
  const selected = columns?.[report];
  if (selected?.length) return selected;
  return [...DEFAULT_EXPORT_COLUMNS[report]];
}

export function resolveMemberExportColumns(
  report: MemberExportReportType,
  columns?: Partial<Record<MemberExportReportType, string[]>>
): string[] {
  const selected = columns?.[report];
  if (selected?.length) return selected;
  return [...DEFAULT_MEMBER_EXPORT_COLUMNS[report]];
}

export const generateInvoiceSchema = z.object({
  projectId: uuidSchema,
  from: isoDatetimeSchema,
  to: isoDatetimeSchema,
  invoiceNumber: z.string().min(1).max(50),
  dueDate: isoDatetimeSchema,
  companyName: z.string().min(1).max(120),
  clientName: z.string().min(1).max(120)
});

export type GenerateInvoiceDto = z.infer<typeof generateInvoiceSchema>;

export const exportJobStatusSchema = z.enum(["queued", "running", "ready", "failed", "expired"]);

export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

export const createExportJobSchema = exportBodySchema;

export type CreateExportJobDto = z.infer<typeof createExportJobSchema>;

export const exportJobDtoSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  requestedByUserId: uuidSchema,
  body: exportBodySchema,
  status: exportJobStatusSchema,
  filename: z.string().nullable(),
  contentType: z.string().nullable(),
  byteSize: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: isoDatetimeSchema,
  completedAt: isoDatetimeSchema.nullable(),
  expiresAt: isoDatetimeSchema.nullable()
});

export type ExportJobDto = z.infer<typeof exportJobDtoSchema>;
