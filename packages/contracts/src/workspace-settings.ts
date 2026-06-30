import { z } from "zod";
import { currencyCodeSchema, DEFAULT_CURRENCY } from "./dto/common.dto";

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
    timerStaleWarningHours: z.number().positive().max(24).optional(),
    currency: currencyCodeSchema.optional(),
    jiraSiteUrl: z.string().url().optional(),
    jiraServiceEmail: z.string().email().optional(),
    jiraServiceToken: z.string().max(500).optional()
  })
  .passthrough();

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

export function parseWorkspaceSettings(raw: unknown): WorkspaceSettings {
  const parsed = workspaceSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function resolveEffectiveTimerStaleWarningHours(
  workspaceSettings: WorkspaceSettings
): number {
  const hours = workspaceSettings.timerStaleWarningHours;
  if (typeof hours === "number" && hours > 0) {
    return hours;
  }
  return DEFAULT_STALE_WARNING_HOURS;
}

export function resolveEffectiveCurrency(workspaceSettings: WorkspaceSettings): string {
  const currency = workspaceSettings.currency;
  if (typeof currency === "string" && /^[A-Z]{3}$/.test(currency)) {
    return currency;
  }
  return DEFAULT_CURRENCY;
}

export const DEFAULT_EXPECTED_WEEKLY_HOURS = 40;
export const DEFAULT_STALE_WARNING_HOURS = 8;
export const DEFAULT_HARD_AUTO_STOP_HOURS = 12;

function resolveHardAutoStopHours(): number {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  const raw = env?.HARD_AUTO_STOP_HOURS ?? env?.NEXT_PUBLIC_HARD_AUTO_STOP_HOURS;
  if (raw) {
    const hours = Number(raw);
    if (Number.isFinite(hours) && hours > 0) {
      return hours;
    }
  }
  return DEFAULT_HARD_AUTO_STOP_HOURS;
}

export const HARD_AUTO_STOP_HOURS = resolveHardAutoStopHours();
