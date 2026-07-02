"use client";

import { AppModal, Button, Label, PasswordInput, cn } from "@kloqra/ui";
import { api } from "@kloqra/web-shared";
import { Key, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

type StaffType = {
  id: string;
  name: string;
};

type StaffChangePasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffType | null;
  onUpdated?: () => void;
};

const changePasswordSchema = z.object({
  password: z.string().min(8)
});

function generateRandomPassword() {
  const length = 16;
  const charset = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    special: "!@#$%^&*()_+~`|}{[]:;?><,./-="
  };

  let password = "";
  password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)];
  password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)];
  password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
  password += charset.special[Math.floor(Math.random() * charset.special.length)];

  const allChars = charset.uppercase + charset.lowercase + charset.numbers + charset.special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle
  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}

function getPasswordStrength(pwd: string) {
  if (!pwd) return { score: 0, label: "", color: "bg-muted" };
  if (pwd.length < 8) return { score: 1, label: "Weak (too short)", color: "bg-destructive" };

  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  let score = 1;
  if (hasLower && hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  switch (score) {
    case 1:
      return { score, label: "Weak", color: "bg-destructive" };
    case 2:
      return { score, label: "Fair", color: "bg-warning" };
    case 3:
      return { score, label: "Good", color: "bg-primary" };
    case 4:
      return { score, label: "Strong", color: "bg-success" };
    default:
      return { score: 1, label: "Weak", color: "bg-destructive" };
  }
}

export function StaffChangePasswordModal({
  open,
  onOpenChange,
  staff,
  onUpdated
}: StaffChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError("");
    setSaving(false);
  }, [open]);

  function handleSuggestPassword() {
    const suggested = generateRandomPassword();
    setPassword(suggested);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    setError("");

    const parsed = changePasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      await api(`/platform/staff/${staff.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password })
      });
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Change staff password"
      description={`Set a new password for ${staff?.name}.`}
      icon={<Lock className="h-5 w-5" />}
      size="md"
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
          <Button type="submit" form="staff-password-form" disabled={saving}>
            {saving ? "Saving…" : "Save password"}
          </Button>
        </div>
      }
    >
      <form id="staff-password-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="change-staff-password">New Password</Label>
            <button
              type="button"
              onClick={handleSuggestPassword}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1 focus-visible:outline-none"
            >
              <Key className="size-3" />
              Suggest password
            </button>
          </div>
          <PasswordInput
            id="change-staff-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Enter new password"
          />
        </div>

        {password ? (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Password strength</span>
              <span
                className={cn(
                  "font-semibold",
                  strength.score === 1 && "text-destructive",
                  strength.score === 2 && "text-warning",
                  strength.score === 3 && "text-primary",
                  strength.score === 4 && "text-success"
                )}
              >
                {strength.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    step <= strength.score ? strength.color : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </AppModal>
  );
}
