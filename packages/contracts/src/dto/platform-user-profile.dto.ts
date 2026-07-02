import { z } from "zod";
import {
  platformPreferencesSchema,
  updatePlatformPreferencesSchema
} from "../platform-preferences";
import { platformRoleSchema } from "../tenant-rbac";
import { themePreferenceSchema } from "../user-preferences";
import { emailSchema, passwordValidationSchema } from "./common.dto";

export const platformUserProfileSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  name: z.string().min(1).max(120),
  platformRole: platformRoleSchema,
  preferences: platformPreferencesSchema,
  effectiveTheme: themePreferenceSchema,
  twoFactorEnabled: z.boolean()
});

export const updatePlatformUserProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
  });

export const changePlatformPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordValidationSchema
});

export const loginRequiresPlatform2faSetupResponseSchema = z.object({
  requires2faSetup: z.literal(true),
  pendingToken: z.string()
});

export const platform2faSetupEnableResponseSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
  qrCodeDataUrl: z.string().optional()
});

export const platform2faSetupEnableRequestSchema = z.object({
  pendingToken: z.string().min(1)
});

export const completePlatform2faSetupSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().length(6).regex(/^\d+$/)
});

export type PlatformUserProfileDto = z.infer<typeof platformUserProfileSchema>;
export type UpdatePlatformUserProfileDto = z.infer<typeof updatePlatformUserProfileSchema>;
export type ChangePlatformPasswordDto = z.infer<typeof changePlatformPasswordSchema>;
export type LoginRequiresPlatform2faSetupResponseDto = z.infer<
  typeof loginRequiresPlatform2faSetupResponseSchema
>;
export type Platform2faSetupEnableResponseDto = z.infer<
  typeof platform2faSetupEnableResponseSchema
>;
export type Platform2faSetupEnableRequestDto = z.infer<typeof platform2faSetupEnableRequestSchema>;
export type CompletePlatform2faSetupDto = z.infer<typeof completePlatform2faSetupSchema>;

export { updatePlatformPreferencesSchema };
