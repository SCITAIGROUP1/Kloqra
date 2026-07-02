import { z } from "zod";
import {
  dateFormatPreferenceSchema,
  themePreferenceSchema,
  timeFormatPreferenceSchema,
  userPreferencesSchema
} from "../user-preferences";
import {
  emailSchema,
  uuidSchema,
  passwordValidationSchema,
  workspaceRoleSchema
} from "./common.dto";

export const userActivityStatsSchema = z.object({
  totalHours: z.number().nonnegative(),
  projectCount: z.number().int().nonnegative(),
  memberSince: z.string().datetime()
});

export const userWorkContextSchema = z.object({
  organizationName: z.string().min(1).max(120),
  workspaceName: z.string().min(1).max(120),
  workspaceRole: workspaceRoleSchema
});

export const userProfileSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(120),
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60),
  phone: z.string().max(40).nullable(),
  location: z.string().max(120).nullable(),
  jobTitle: z.string().max(120).nullable(),
  department: z.string().max(120).nullable(),
  workStartDate: z.string().date().nullable(),
  /** Admin workspace only — omitted for MEMBER role. */
  defaultHourlyRate: z.number().nonnegative().nullable().optional(),
  preferences: userPreferencesSchema,
  effectiveDailyTargetHours: z.number().positive().max(24),
  effectiveTimerStaleWarningHours: z.number().positive().max(24),
  effectiveTimezone: z.string(),
  effectiveDateFormat: dateFormatPreferenceSchema,
  effectiveTimeFormat: timeFormatPreferenceSchema,
  effectiveTheme: themePreferenceSchema,
  twoFactorEnabled: z.boolean(),
  workContext: userWorkContextSchema,
  activityStats: userActivityStatsSchema,
  jiraEmail: z.string().email().nullable().optional(),
  jiraConnected: z.boolean().optional(),
  workspaceJiraSiteUrl: z.string().url().nullable().optional()
});

export const updateUserProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    firstName: z.string().min(1).max(60).optional(),
    lastName: z.string().max(60).optional(),
    phone: z.string().max(40).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    jobTitle: z.string().max(120).nullable().optional(),
    department: z.string().max(120).nullable().optional(),
    workStartDate: z.string().date().nullable().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
  });

export const updateUserPreferencesSchema = userPreferencesSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordValidationSchema
});

export const userSessionSchema = z.object({
  id: uuidSchema,
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  lastUsedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isCurrent: z.boolean()
});

export const twoFactorEnableResponseSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  qrCodeDataUrl: z.string().optional()
});

export const twoFactorVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/)
});

export const twoFactorDisableSchema = z.object({
  currentPassword: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/)
});

export const loginWith2faSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  totpCode: z.string().length(6).regex(/^\d+$/).optional()
});

export const loginRequires2faResponseSchema = z.object({
  requires2fa: z.literal(true),
  pendingToken: z.string()
});

export type UserActivityStatsDto = z.infer<typeof userActivityStatsSchema>;
export type UserWorkContextDto = z.infer<typeof userWorkContextSchema>;
export type UserProfileDto = z.infer<typeof userProfileSchema>;
export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserPreferencesDto = z.infer<typeof updateUserPreferencesSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type UserSessionDto = z.infer<typeof userSessionSchema>;
export type TwoFactorEnableResponseDto = z.infer<typeof twoFactorEnableResponseSchema>;
export type TwoFactorVerifyDto = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorDisableDto = z.infer<typeof twoFactorDisableSchema>;
export type LoginWith2faDto = z.infer<typeof loginWith2faSchema>;
export type LoginRequires2faResponseDto = z.infer<typeof loginRequires2faResponseSchema>;
