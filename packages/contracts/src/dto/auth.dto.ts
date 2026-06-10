import { z } from "zod";
import { emailSchema, uuidSchema, workspaceRoleSchema } from "./common.dto";

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  workspaceName: z.string().min(1).max(120).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  totpCode: z.string().length(6).regex(/^\d+$/).optional(),
  pendingToken: z.string().optional()
});

export const authUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string(),
  defaultHourlyRate: z.number().nonnegative().nullable()
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
  impersonatorId: uuidSchema.optional(),
  impersonatorName: z.string().optional()
});

export const authSessionWithTokenSchema = authSessionSchema.extend({
  accessToken: z.string()
});

export const impersonateSchema = z.object({
  userId: uuidSchema
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type AuthUserDto = z.infer<typeof authUserSchema>;
export type AuthSessionDto = z.infer<typeof authSessionSchema>;
export type AuthSessionWithTokenDto = z.infer<typeof authSessionWithTokenSchema>;
export type ImpersonateDto = z.infer<typeof impersonateSchema>;
