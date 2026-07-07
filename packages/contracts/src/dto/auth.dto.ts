import { z } from "zod";
import { PLAN_SLUGS } from "../plan-catalog";
import { tenantMemberRoleSchema } from "../tenant-rbac";
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

const authSessionCoreSchema = z.object({
  user: authUserSchema,
  tenantId: uuidSchema,
  tenantRole: tenantMemberRoleSchema.optional(),
  workspaceId: uuidSchema.optional(),
  workspaceName: z.string().min(1).max(120).optional(),
  workspaceRole: workspaceRoleSchema.optional(),
  /** Tenant owner/admin with no workspace yet — must create one before workspace ops. */
  requiresWorkspaceSetup: z.literal(true).optional(),
  /** Preferred workspace from user preferences — avoids bootstrap GET /users/me. */
  defaultWorkspaceId: uuidSchema.optional(),
  /** Project IDs where user is team_members.role = PROJECT_MANAGER (MEMBER workspace role only; not in JWT). */
  managedProjectIds: z.array(uuidSchema).optional(),
  impersonatorId: uuidSchema.optional(),
  impersonatorName: z.string().optional()
});

function refineAuthSession<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const session = data as z.infer<typeof authSessionCoreSchema>;
    if (session.workspaceId && !session.workspaceRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "workspaceRole is required when workspaceId is set",
        path: ["workspaceRole"]
      });
    }
    if (!session.workspaceId && !session.requiresWorkspaceSetup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "workspaceId or requiresWorkspaceSetup is required",
        path: ["workspaceId"]
      });
    }
    if (
      session.requiresWorkspaceSetup &&
      session.tenantRole !== "OWNER" &&
      session.tenantRole !== "ADMIN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requiresWorkspaceSetup requires tenant owner or admin role",
        path: ["requiresWorkspaceSetup"]
      });
    }
  });
}

export const authSessionSchema = refineAuthSession(authSessionCoreSchema);

export const authSessionWithTokenSchema = refineAuthSession(
  authSessionCoreSchema.extend({
    accessToken: z.string(),
    refreshToken: z.string().optional()
  })
);

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1).optional()
});

export const impersonateSchema = z.object({
  userId: uuidSchema
});

export const impersonateHandoffResponseSchema = refineAuthSession(
  authSessionCoreSchema.extend({
    handoffToken: z.string().min(1)
  })
);

export const completeImpersonationSchema = z.object({
  handoffToken: z.string().min(1)
});

export const loginRequiresPasswordChangeResponseSchema = z.object({
  requiresPasswordChange: z.literal(true),
  pendingToken: z.string()
});

export const inviteHandoffSchema = z.object({
  inviteToken: z.string().min(1)
});

export const inviteHandoffResponseSchema = loginRequiresPasswordChangeResponseSchema.extend({
  email: emailSchema,
  temporaryPassword: z.string().min(1),
  emailVerificationToken: z.string().min(1).optional()
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

/** Self-serve signup — public plans only (SaaS-F20). */
export const signupPlanSlugSchema = z.enum([PLAN_SLUGS.STARTER, PLAN_SLUGS.PRO]);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordValidationSchema,
  name: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120),
  planSlug: signupPlanSlugSchema
});

export const signupResponseSchema = okResponseSchema;

export type SignupPlanSlug = z.infer<typeof signupPlanSlugSchema>;

export type LoginDto = z.infer<typeof loginSchema>;
export type LoginRequiresPasswordChangeResponseDto = z.infer<
  typeof loginRequiresPasswordChangeResponseSchema
>;
export type InviteHandoffDto = z.infer<typeof inviteHandoffSchema>;
export type InviteHandoffResponseDto = z.infer<typeof inviteHandoffResponseSchema>;
export type LoginRequiresEmailVerificationResponseDto = z.infer<
  typeof loginRequiresEmailVerificationResponseSchema
>;
export type SetInitialPasswordDto = z.infer<typeof setInitialPasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
export type SignupDto = z.infer<typeof signupSchema>;
export type SignupResponseDto = z.infer<typeof signupResponseSchema>;
export type OkResponseDto = z.infer<typeof okResponseSchema>;
export type AuthUserDto = z.infer<typeof authUserSchema>;
export type AuthSessionDto = z.infer<typeof authSessionSchema>;
export type AuthSessionWithTokenDto = z.infer<typeof authSessionWithTokenSchema>;
export type RefreshSessionDto = z.infer<typeof refreshSessionSchema>;
export type ImpersonateDto = z.infer<typeof impersonateSchema>;
export type ImpersonateHandoffResponseDto = z.infer<typeof impersonateHandoffResponseSchema>;
export type CompleteImpersonationDto = z.infer<typeof completeImpersonationSchema>;
