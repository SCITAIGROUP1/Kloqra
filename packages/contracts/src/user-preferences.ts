import { z } from "zod";
import { userDashboardLayoutsSchema } from "./dashboard-layout";
import { uuidSchema } from "./dto/common.dto";

export const themePreferenceSchema = z.enum(["light", "dark", "system"]);
export const dateFormatPreferenceSchema = z.enum(["MDY", "DMY", "YMD"]);
export const timeFormatPreferenceSchema = z.enum(["12h", "24h"]);
export const startupPagePreferenceSchema = z.enum([
  "dashboard",
  "timer",
  "timesheet",
  "time-tracker"
]);

export const notificationChannelSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean()
});

export type NotificationChannels = z.infer<typeof notificationChannelSchema>;

/** Per-type channel prefs. Legacy boolean or `{ inApp?, email? }` normalized on read. */
export const notificationPreferenceSchema = z.union([
  z.boolean(),
  notificationChannelSchema.partial(),
  z.object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional()
  })
]);

export const memberNotificationKeySchema = z.enum([
  "workspaceAdded",
  "projectAssignment",
  "taskAssignment",
  "timesheetReminders",
  "idleTimerAlert",
  "jiraSyncUpdates",
  "timesheetStatus"
]);

export const adminNotificationKeySchema = z.enum([
  "approvalRequest",
  "memberChanges",
  "exportSchedule",
  "budgetAlert"
]);

export const notificationPreferenceKeySchema = z.union([
  memberNotificationKeySchema,
  adminNotificationKeySchema
]);

export type MemberNotificationKey = z.infer<typeof memberNotificationKeySchema>;
export type AdminNotificationKey = z.infer<typeof adminNotificationKeySchema>;
export type NotificationPreferenceKey = z.infer<typeof notificationPreferenceKeySchema>;

export const userNotificationsSchema = z.object({
  enabled: z.boolean(),
  workspaceAdded: notificationPreferenceSchema,
  projectAssignment: notificationPreferenceSchema,
  taskAssignment: notificationPreferenceSchema,
  timesheetReminders: notificationPreferenceSchema,
  idleTimerAlert: notificationPreferenceSchema,
  jiraSyncUpdates: notificationPreferenceSchema,
  timesheetStatus: notificationPreferenceSchema,
  approvalRequest: notificationPreferenceSchema,
  memberChanges: notificationPreferenceSchema,
  exportSchedule: notificationPreferenceSchema,
  budgetAlert: notificationPreferenceSchema
});

export type ResolvedUserNotifications = {
  enabled: boolean;
  workspaceAdded: NotificationChannels;
  projectAssignment: NotificationChannels;
  taskAssignment: NotificationChannels;
  timesheetReminders: NotificationChannels;
  idleTimerAlert: NotificationChannels;
  jiraSyncUpdates: NotificationChannels;
  timesheetStatus: NotificationChannels;
  approvalRequest: NotificationChannels;
  memberChanges: NotificationChannels;
  exportSchedule: NotificationChannels;
  budgetAlert: NotificationChannels;
};

const memberChannelDefaults: Record<MemberNotificationKey, NotificationChannels> = {
  workspaceAdded: { inApp: true, email: false },
  projectAssignment: { inApp: true, email: false },
  taskAssignment: { inApp: true, email: false },
  timesheetReminders: { inApp: true, email: true },
  idleTimerAlert: { inApp: true, email: false },
  jiraSyncUpdates: { inApp: true, email: false },
  timesheetStatus: { inApp: true, email: true }
};

const adminChannelDefaults: Record<AdminNotificationKey, NotificationChannels> = {
  approvalRequest: { inApp: true, email: true },
  memberChanges: { inApp: true, email: false },
  exportSchedule: { inApp: true, email: true },
  budgetAlert: { inApp: true, email: false }
};

export const DEFAULT_USER_NOTIFICATIONS: ResolvedUserNotifications = {
  enabled: true,
  ...memberChannelDefaults,
  ...adminChannelDefaults
};

export function memberNotificationKeys(): MemberNotificationKey[] {
  return memberNotificationKeySchema.options;
}

export function adminNotificationKeys(): AdminNotificationKey[] {
  return adminNotificationKeySchema.options;
}

/** Maps stored preference (boolean or legacy channel object) to channel pair. */
export function normalizeNotificationChannels(
  value: unknown,
  fallback: NotificationChannels
): NotificationChannels {
  if (typeof value === "boolean") {
    return { inApp: true, email: value };
  }
  if (value && typeof value === "object") {
    const legacy = value as { inApp?: boolean; email?: boolean };
    return {
      inApp: typeof legacy.inApp === "boolean" ? legacy.inApp : fallback.inApp,
      email: typeof legacy.email === "boolean" ? legacy.email : fallback.email
    };
  }
  return fallback;
}

/** @deprecated Use normalizeNotificationChannels — email channel only. */
export function normalizeNotificationPreference(value: unknown, fallback: boolean): boolean {
  return normalizeNotificationChannels(value, { inApp: true, email: fallback }).email;
}

export const userPreferencesSchema = z
  .object({
    dailyTargetHours: z.number().positive().max(24).optional(),
    /** `null` clears a saved timezone so the browser default is used. */
    timezone: z.string().nullable().optional(),
    weekStart: z.enum(["monday", "sunday"]).optional(),
    theme: themePreferenceSchema.optional(),
    dateFormat: dateFormatPreferenceSchema.optional(),
    timeFormat: timeFormatPreferenceSchema.optional(),
    language: z.string().min(2).max(10).optional(),
    defaultWorkspaceId: uuidSchema.optional(),
    startupPage: startupPagePreferenceSchema.optional(),
    notifications: userNotificationsSchema.partial().optional(),
    /** Per-workspace dashboard widget layouts (client + admin apps). */
    dashboardLayouts: userDashboardLayoutsSchema.optional()
  })
  .passthrough();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type DateFormatPreference = z.infer<typeof dateFormatPreferenceSchema>;
export type TimeFormatPreference = z.infer<typeof timeFormatPreferenceSchema>;
export type StartupPagePreference = z.infer<typeof startupPagePreferenceSchema>;
export type UserNotifications = z.infer<typeof userNotificationsSchema>;

export const DEFAULT_DAILY_TARGET_HOURS = 8;
export const DEFAULT_DATE_FORMAT: DateFormatPreference = "MDY";
export const DEFAULT_TIME_FORMAT: TimeFormatPreference = "12h";
export const DEFAULT_THEME: ThemePreference = "system";
export const DEFAULT_LANGUAGE = "en";
export const DEFAULT_STARTUP_PAGE: StartupPagePreference = "dashboard";

export function parseUserPreferences(raw: unknown): UserPreferences {
  const parsed = userPreferencesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

function mergeNotificationKey(
  current: Partial<UserNotifications> | undefined,
  partial: Partial<UserNotifications> | undefined,
  key: NotificationPreferenceKey
) {
  return partial?.[key] ?? current?.[key] ?? DEFAULT_USER_NOTIFICATIONS[key];
}

export function mergeUserPreferences(
  current: UserPreferences,
  partial: Partial<UserPreferences>
): UserPreferences {
  const merged: UserPreferences = { ...current, ...partial };
  if ("timezone" in partial && (partial.timezone === null || partial.timezone === "")) {
    delete merged.timezone;
  }
  if (partial.notifications) {
    const cur = current.notifications;
    const part = partial.notifications;
    merged.notifications = {
      enabled: part.enabled ?? cur?.enabled ?? DEFAULT_USER_NOTIFICATIONS.enabled,
      workspaceAdded: mergeNotificationKey(cur, part, "workspaceAdded"),
      projectAssignment: mergeNotificationKey(cur, part, "projectAssignment"),
      taskAssignment: mergeNotificationKey(cur, part, "taskAssignment"),
      timesheetReminders: mergeNotificationKey(cur, part, "timesheetReminders"),
      idleTimerAlert: mergeNotificationKey(cur, part, "idleTimerAlert"),
      jiraSyncUpdates: mergeNotificationKey(cur, part, "jiraSyncUpdates"),
      timesheetStatus: mergeNotificationKey(cur, part, "timesheetStatus"),
      approvalRequest: mergeNotificationKey(cur, part, "approvalRequest"),
      memberChanges: mergeNotificationKey(cur, part, "memberChanges"),
      exportSchedule: mergeNotificationKey(cur, part, "exportSchedule"),
      budgetAlert: mergeNotificationKey(cur, part, "budgetAlert")
    };
  }
  return merged;
}

export function resolveEffectiveDailyTargetHours(
  userPreferences: UserPreferences,
  workspaceDailyTargetHours?: number
): number {
  if (typeof userPreferences.dailyTargetHours === "number") {
    return userPreferences.dailyTargetHours;
  }
  if (typeof workspaceDailyTargetHours === "number" && workspaceDailyTargetHours > 0) {
    return workspaceDailyTargetHours;
  }
  return DEFAULT_DAILY_TARGET_HOURS;
}

/** User preference timezone, or browser/system timezone when unset ("Browser default"). */
export function resolveEffectiveTimezone(
  userPreferences: UserPreferences,
  browserTimezone?: string
): string {
  if (userPreferences.timezone) {
    return userPreferences.timezone;
  }
  return browserTimezone || "UTC";
}

export function resolveEffectiveDateFormat(userPreferences: UserPreferences): DateFormatPreference {
  return userPreferences.dateFormat ?? DEFAULT_DATE_FORMAT;
}

export function resolveEffectiveTimeFormat(userPreferences: UserPreferences): TimeFormatPreference {
  return userPreferences.timeFormat ?? DEFAULT_TIME_FORMAT;
}

export function resolveEffectiveTheme(userPreferences: UserPreferences): ThemePreference {
  return userPreferences.theme ?? DEFAULT_THEME;
}

export function resolveEffectiveLanguage(userPreferences: UserPreferences): string {
  return userPreferences.language ?? DEFAULT_LANGUAGE;
}

export function resolveEffectiveStartupPage(
  userPreferences: UserPreferences
): StartupPagePreference {
  return userPreferences.startupPage ?? DEFAULT_STARTUP_PAGE;
}

export function resolveEffectiveNotifications(
  userPreferences: UserPreferences
): ResolvedUserNotifications {
  const partial: Partial<UserNotifications> = userPreferences.notifications ?? {};
  const resolve = (key: NotificationPreferenceKey) =>
    normalizeNotificationChannels(partial[key], DEFAULT_USER_NOTIFICATIONS[key]);

  return {
    enabled: partial.enabled ?? DEFAULT_USER_NOTIFICATIONS.enabled,
    workspaceAdded: resolve("workspaceAdded"),
    projectAssignment: resolve("projectAssignment"),
    taskAssignment: resolve("taskAssignment"),
    timesheetReminders: resolve("timesheetReminders"),
    idleTimerAlert: resolve("idleTimerAlert"),
    jiraSyncUpdates: resolve("jiraSyncUpdates"),
    timesheetStatus: resolve("timesheetStatus"),
    approvalRequest: resolve("approvalRequest"),
    memberChanges: resolve("memberChanges"),
    exportSchedule: resolve("exportSchedule"),
    budgetAlert: resolve("budgetAlert")
  };
}

export function resolveNotificationChannels(
  userPreferences: UserPreferences,
  key: NotificationPreferenceKey
): NotificationChannels {
  const resolved = resolveEffectiveNotifications(userPreferences);
  if (!resolved.enabled) {
    return { inApp: false, email: false };
  }
  return resolved[key];
}

export function formatUserDate(
  date: Date,
  dateFormat: DateFormatPreference,
  timezone: string
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  if (dateFormat === "DMY") return `${day}/${month}/${year}`;
  if (dateFormat === "YMD") return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}

export function formatUserTime(
  date: Date,
  timeFormat: TimeFormatPreference,
  timezone: string
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12h"
  }).format(date);
}

export function formatUserDateTime(
  date: Date,
  preferences: UserPreferences,
  browserTimezone?: string
): string {
  const timezone = resolveEffectiveTimezone(preferences, browserTimezone);
  const dateFormat = resolveEffectiveDateFormat(preferences);
  const timeFormat = resolveEffectiveTimeFormat(preferences);
  return `${formatUserDate(date, dateFormat, timezone)} • ${formatUserTime(date, timeFormat, timezone)}`;
}
