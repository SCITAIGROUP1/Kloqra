import { passwordValidationSchema } from "@kloqra/contracts";

export const RESET_PASSWORD_MISMATCH_MESSAGE = "Passwords do not match. Please re-enter.";

export type ResetPasswordFieldErrors = {
  password?: string;
  confirm?: string;
};

export function validateResetPasswordFields(
  password: string,
  confirm: string
): ResetPasswordFieldErrors {
  const result = passwordValidationSchema.safeParse(password);
  if (!result.success) {
    return { password: result.error.errors[0]?.message ?? "Invalid password." };
  }
  if (password !== confirm) {
    return { confirm: RESET_PASSWORD_MISMATCH_MESSAGE };
  }
  return {};
}
