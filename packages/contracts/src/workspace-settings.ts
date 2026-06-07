import { z } from "zod";

export const timesheetApprovalPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

export type TimesheetApprovalPeriod = z.infer<typeof timesheetApprovalPeriodSchema>;

export const DEFAULT_TIMESHEET_APPROVAL_PERIOD: TimesheetApprovalPeriod = "weekly";

export const workspaceSettingsSchema = z
  .object({
    logoUrl: z.string().url().optional(),
    exportFooterNote: z.string().max(500).optional(),
    weekStart: z.enum(["monday", "sunday"]).optional(),
    timesheetApprovalPeriod: timesheetApprovalPeriodSchema.optional(),
    expectedWeeklyHours: z.number().positive().optional(),
    dailyTargetHours: z.number().positive().max(24).optional(),
    roundingMinutes: z.number().int().nonnegative().optional(),
    timezone: z.string().optional(),
    timerStaleWarningHours: z.number().positive().max(24).optional()
  })
  .passthrough();

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

export function parseWorkspaceSettings(raw: unknown): WorkspaceSettings {
  const parsed = workspaceSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export const DEFAULT_EXPECTED_WEEKLY_HOURS = 40;
export const DEFAULT_STALE_WARNING_HOURS = 8;
export const HARD_AUTO_STOP_HOURS = 14;
