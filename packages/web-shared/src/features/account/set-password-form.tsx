"use client";

import { passwordValidationSchema } from "@kloqra/contracts";
import { Button, PasswordInput, Label } from "@kloqra/ui";
import { useState } from "react";
import { PasswordStrengthIndicator } from "../../components/password-strength-indicator";
import { extractFieldErrorsFromMessage } from "../../utils/form-errors";

type SetPasswordFormProps = {
  pendingToken: string;
  onSubmit: (newPassword: string) => Promise<void>;
  submitLabel?: string;
};

export function SetPasswordForm({
  pendingToken,
  onSubmit,
  submitLabel = "Set password"
}: SetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const result = passwordValidationSchema.safeParse(newPassword);
    if (!result.success) {
      setFieldErrors({ newPassword: result.error.errors[0]?.message ?? "Invalid password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }
    setSaving(true);
    try {
      await onSubmit(newPassword);
    } catch (err) {
      if (err instanceof Error) {
        const parsed = extractFieldErrorsFromMessage(err.message, {
          newPassword: ["New Password", "Password"],
          confirmPassword: "Confirm Password"
        });
        setFieldErrors(parsed.fieldErrors);
        setError(parsed.formError);
      } else {
        setError("Could not set password.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!pendingToken) {
    return (
      <p className="text-sm text-destructive">Missing or expired sign-in session. Sign in again.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (fieldErrors.newPassword) {
              setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
            }
          }}
          required
          minLength={8}
          aria-invalid={Boolean(fieldErrors.newPassword)}
        />
        <PasswordStrengthIndicator password={newPassword} />
        {fieldErrors.newPassword ? (
          <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }
          }}
          required
          minLength={8}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
        />
        {fieldErrors.confirmPassword ? (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
