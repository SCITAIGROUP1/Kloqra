import { z } from "zod";
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

/** Email on/off for a single notification type. Legacy `{ inApp, email }` objects are normalized on read. */
export const notificationPreferenceSchema = z.union([
  z.boolean(),
  z.object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional()
  })
]);

export const userNotificationsSchema = z.object({
  enabled: z.boolean(),
  projectAssignment: notificationPreferenceSchema,
  taskAssignment: notificationPreferenceSchema,
  timesheetReminders: notificationPreferenceSchema,
  idleTimerAlert: notificationPreferenceSchema,
  jiraSyncUpdates: notificationPreferenceSchema
});

export type ResolvedUserNotifications = {
  enabled: boolean;
  projectAssignment: boolean;
  taskAssignment: boolean;
  timesheetReminders: boolean;
  idleTimerAlert: boolean;
  jiraSyncUpdates: boolean;
};

export const DEFAULT_USER_NOTIFICATIONS: ResolvedUserNotifications = {
  enabled: true,
  projectAssignment: false,
  taskAssignment: false,
  timesheetReminders: true,
  idleTimerAlert: false,
  jiraSyncUpdates: false
};

/** Maps stored preference (boolean or legacy channel object) to email enabled. */
export function normalizeNotificationPreference(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    const legacy = value as { inApp?: boolean; email?: boolean };
    if (typeof legacy.email === "boolean") return legacy.email;
    if (typeof legacy.inApp === "boolean") return legacy.inApp;
  }
  return fallback;
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
    notifications: userNotificationsSchema.partial().optional()
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

export function mergeUserPreferences(
  current: UserPreferences,
  partial: Partial<UserPreferences>
): UserPreferences {
  const merged: UserPreferences = { ...current, ...partial };
  if ("timezone" in partial && (partial.timezone === null || partial.timezone === "")) {
    delete merged.timezone;
  }
  if (partial.notifications) {
    merged.notifications = {
      enabled:
        partial.notifications.enabled ??
        current.notifications?.enabled ??
        DEFAULT_USER_NOTIFICATIONS.enabled,
      projectAssignment:
        partial.notifications.projectAssignment ??
        current.notifications?.projectAssignment ??
        DEFAULT_USER_NOTIFICATIONS.projectAssignment,
      taskAssignment:
        partial.notifications.taskAssignment ??
        current.notifications?.taskAssignment ??
        DEFAULT_USER_NOTIFICATIONS.taskAssignment,
      timesheetReminders:
        partial.notifications.timesheetReminders ??
        current.notifications?.timesheetReminders ??
        DEFAULT_USER_NOTIFICATIONS.timesheetReminders,
      idleTimerAlert:
        partial.notifications.idleTimerAlert ??
        current.notifications?.idleTimerAlert ??
        DEFAULT_USER_NOTIFICATIONS.idleTimerAlert,
      jiraSyncUpdates:
        partial.notifications.jiraSyncUpdates ??
        current.notifications?.jiraSyncUpdates ??
        DEFAULT_USER_NOTIFICATIONS.jiraSyncUpdates
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
  const partial = userPreferences.notifications ?? {};
  return {
    enabled: partial.enabled ?? DEFAULT_USER_NOTIFICATIONS.enabled,
    projectAssignment: normalizeNotificationPreference(
      partial.projectAssignment,
      DEFAULT_USER_NOTIFICATIONS.projectAssignment
    ),
    taskAssignment: normalizeNotificationPreference(
      partial.taskAssignment,
      DEFAULT_USER_NOTIFICATIONS.taskAssignment
    ),
    timesheetReminders: normalizeNotificationPreference(
      partial.timesheetReminders,
      DEFAULT_USER_NOTIFICATIONS.timesheetReminders
    ),
    idleTimerAlert: normalizeNotificationPreference(
      partial.idleTimerAlert,
      DEFAULT_USER_NOTIFICATIONS.idleTimerAlert
    ),
    jiraSyncUpdates: normalizeNotificationPreference(
      partial.jiraSyncUpdates,
      DEFAULT_USER_NOTIFICATIONS.jiraSyncUpdates
    )
  };
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
