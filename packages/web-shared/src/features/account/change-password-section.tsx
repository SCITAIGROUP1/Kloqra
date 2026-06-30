"use client";

import { passwordValidationSchema } from "@kloqra/contracts";
import { Button, PasswordInput, Label } from "@kloqra/ui";
import { useState } from "react";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "../../components/password-strength-indicator";
import { AccountSectionFooter } from "./account-section-footer";

type ChangePasswordSectionProps = {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

export function ChangePasswordSection({ onChangePassword }: ChangePasswordSectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0;

  async function handleSave() {
    const result = passwordValidationSchema.safeParse(newPassword);
    if (!result.success) {
      toast.error(result.error.errors[0]?.message ?? "Invalid password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated. Redirecting to sign in…");
      window.location.assign("/login?reason=password-changed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="grid max-w-md gap-5">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-10 bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-10 bg-background"
          />
          <PasswordStrengthIndicator password={newPassword} />
          <p className="text-xs text-muted-foreground">
            Must contain uppercase, lowercase, numbers, and special characters.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 bg-background"
          />
        </div>
      </div>

      <AccountSectionFooter>
        <Button
          onClick={() => void handleSave()}
          disabled={saving || !canSubmit}
          className="min-w-[140px]"
        >
          {saving ? "Updating…" : "Update password"}
        </Button>
      </AccountSectionFooter>
    </div>
  );
}
