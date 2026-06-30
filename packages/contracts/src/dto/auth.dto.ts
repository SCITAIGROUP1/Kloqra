import { z } from "zod";
import {
  emailSchema,
  uuidSchema,
  workspaceRoleSchema,
  passwordValidationSchema
} from "./common.dto";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  totpCode: z.string().length(6).regex(/^\d+$/).optional(),
  pendingToken: z.string().optional()
});

export const authUserSchema = z.object({
  id: uuidSchema,
  /** Omitted from session bootstrap — use GET /users/me when email is needed. */
  email: emailSchema.optional(),
  name: z.string(),
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().max(60).optional(),
  /** Admin session only — omitted for MEMBER role. */
  defaultHourlyRate: z.number().nonnegative().nullable().optional()
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number()
});

export const authSessionSchema = z.object({
  user: authUserSchema,
  workspaceId: uuidSchema,
  workspaceName: z.string().min(1).max(120).optional(),
  workspaceRole: workspaceRoleSchema,
  /** Preferred workspace from user preferences — avoids bootstrap GET /users/me. */
  defaultWorkspaceId: uuidSchema.optional(),
  impersonatorId: uuidSchema.optional(),
  impersonatorName: z.string().optional()
});

export const authSessionWithTokenSchema = authSessionSchema.extend({
  accessToken: z.string(),
  refreshToken: z.string().optional()
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1).optional()
});

export const impersonateSchema = z.object({
  userId: uuidSchema
});

export const impersonateHandoffResponseSchema = authSessionSchema.extend({
  handoffToken: z.string().min(1)
});

export const completeImpersonationSchema = z.object({
  handoffToken: z.string().min(1)
});

export const loginRequiresPasswordChangeResponseSchema = z.object({
  requiresPasswordChange: z.literal(true),
  pendingToken: z.string()
});

export const loginRequiresEmailVerificationResponseSchema = z.object({
  requiresEmailVerification: z.literal(true),
  email: emailSchema
});

export const setInitialPasswordSchema = z.object({
  pendingToken: z.string().min(1),
  newPassword: passwordValidationSchema
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordValidationSchema
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1)
});

export const resendVerificationSchema = z.object({
  email: emailSchema
});

export const okResponseSchema = z.object({
  ok: z.literal(true)
});

export type LoginDto = z.infer<typeof loginSchema>;
export type LoginRequiresPasswordChangeResponseDto = z.infer<
  typeof loginRequiresPasswordChangeResponseSchema
>;
export type LoginRequiresEmailVerificationResponseDto = z.infer<
  typeof loginRequiresEmailVerificationResponseSchema
>;
export type SetInitialPasswordDto = z.infer<typeof setInitialPasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
export type OkResponseDto = z.infer<typeof okResponseSchema>;
export type AuthUserDto = z.infer<typeof authUserSchema>;
export type AuthSessionDto = z.infer<typeof authSessionSchema>;
export type AuthSessionWithTokenDto = z.infer<typeof authSessionWithTokenSchema>;
export type RefreshSessionDto = z.infer<typeof refreshSessionSchema>;
export type ImpersonateDto = z.infer<typeof impersonateSchema>;
export type ImpersonateHandoffResponseDto = z.infer<typeof impersonateHandoffResponseSchema>;
export type CompleteImpersonationDto = z.infer<typeof completeImpersonationSchema>;
