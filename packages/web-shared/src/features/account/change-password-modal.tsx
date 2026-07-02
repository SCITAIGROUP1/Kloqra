"use client";

import { passwordValidationSchema } from "@kloqra/contracts";
import { AppModal, Button, Label, PasswordInput } from "@kloqra/ui";
import { KeyRound } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "../../components/password-strength-indicator";

type ChangePasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

export function ChangePasswordModal({
  open,
  onOpenChange,
  onChangePassword
}: ChangePasswordModalProps) {
  const fieldId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaving(false);
    }
  }, [open]);

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
      onOpenChange(false);
      toast.success("Password updated. Redirecting to sign in…");
      window.location.assign("/login?reason=password-changed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Change password"
      description="Enter your current password and choose a new one."
      icon={<KeyRound className="size-5" />}
      showClose={false}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canSubmit}
            className="min-w-[140px]"
          >
            {saving ? "Updating…" : "Update password"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-current-password`}>Current password</Label>
          <PasswordInput
            id={`${fieldId}-current-password`}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-10 bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-new-password`}>New password</Label>
          <PasswordInput
            id={`${fieldId}-new-password`}
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
          <Label htmlFor={`${fieldId}-confirm-password`}>Confirm new password</Label>
          <PasswordInput
            id={`${fieldId}-confirm-password`}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 bg-background"
          />
        </div>
      </div>
    </AppModal>
  );
}
