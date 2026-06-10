"use client";

import type { UserProfileDto, UserSessionDto } from "@kloqra/contracts";
import { AppModal, Button, DialogClose, Input, Label, Spinner } from "@kloqra/ui";
import { Activity, KeyRound, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChangePasswordSection } from "../../change-password-section";
import { formatSessionDevice } from "../format-session-device";
import { SettingsCard } from "../settings-card";

export function SecuritySection({
  profile,
  onChangePassword,
  onEnable2fa,
  onVerify2fa,
  onDisable2fa,
  onListSessions,
  onRevokeSession
}: {
  profile: UserProfileDto;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onEnable2fa: () => Promise<{ secret: string; otpauthUrl: string }>;
  onVerify2fa: (code: string) => Promise<void>;
  onDisable2fa: (currentPassword: string, code: string) => Promise<void>;
  onListSessions: () => Promise<UserSessionDto[]>;
  onRevokeSession: (sessionId: string) => Promise<void>;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFaOpen, setTwoFaOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);

  async function openSessions() {
    setSessionsOpen(true);
    setLoadingSessions(true);
    try {
      setSessions(await onListSessions());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleEnable2fa() {
    try {
      const result = await onEnable2fa();
      setTwoFaSecret(result.secret);
      setTwoFaOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start 2FA setup");
    }
  }

  async function handleVerify2fa() {
    try {
      await onVerify2fa(twoFaCode);
      setTwoFaOpen(false);
      setTwoFaSecret(null);
      setTwoFaCode("");
      toast.success("Two-factor authentication enabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    }
  }

  async function handleDisable2fa() {
    try {
      await onDisable2fa(disablePassword, disableCode);
      setDisablePassword("");
      setDisableCode("");
      toast.success("Two-factor authentication disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disable 2FA");
    }
  }

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={KeyRound}
        title="Change Password"
        description="Update your password to keep your account secure"
        action={
          <Button type="button" size="sm" onClick={() => setPasswordOpen(true)}>
            Change Password
          </Button>
        }
      />

      <SettingsCard
        icon={Shield}
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
        action={
          profile.twoFactorEnabled ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setTwoFaOpen(true)}>
              Manage 2FA
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => void handleEnable2fa()}>
              Enable 2FA
            </Button>
          )
        }
      />

      <SettingsCard
        icon={Activity}
        title="Active Sessions"
        description="Manage devices where you're currently logged in"
        action={
          <Button type="button" size="sm" variant="outline" onClick={() => void openSessions()}>
            View Sessions
          </Button>
        }
      />

      <AppModal
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title="Change password"
        description="Enter your current password and choose a new one."
        icon={<KeyRound className="size-5" />}
        size="lg"
      >
        <ChangePasswordSection
          onChangePassword={async (current, next) => {
            await onChangePassword(current, next);
            setPasswordOpen(false);
          }}
        />
      </AppModal>

      <AppModal
        open={twoFaOpen}
        onOpenChange={setTwoFaOpen}
        title={profile.twoFactorEnabled ? "Manage two-factor authentication" : "Enable 2FA"}
        description={
          profile.twoFactorEnabled
            ? "Disable 2FA by confirming your password and authentication code."
            : "Scan the secret into your authenticator app, then verify with a code."
        }
        icon={<Shield className="size-5" />}
        size="lg"
      >
        {profile.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Current password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-code">Authentication code</Label>
              <Input
                id="disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <Button type="button" variant="destructive" onClick={() => void handleDisable2fa()}>
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {twoFaSecret ? (
              <p className="text-sm text-muted-foreground break-all">
                Add this secret to your authenticator app: <code>{twoFaSecret}</code>
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="verify-code">Enter 6-digit code</Label>
              <Input
                id="verify-code"
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <Button type="button" onClick={() => void handleVerify2fa()}>
              Verify and enable
            </Button>
          </div>
        )}
      </AppModal>

      <AppModal
        open={sessionsOpen}
        onOpenChange={setSessionsOpen}
        title="Active sessions"
        description="Review devices where your account is signed in and revoke access when needed."
        icon={<Activity className="size-5" />}
        size="lg"
        footer={
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        }
      >
        {loadingSessions ? (
          <Spinner label="Loading sessions…" className="justify-center py-6" />
        ) : sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active sessions found.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatSessionDevice(session.userAgent)}
                    {session.isCurrent ? (
                      <span className="ml-1 text-xs font-normal text-primary">(current)</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Last used {new Date(session.lastUsedAt).toLocaleString()}
                  </p>
                  {session.ipAddress ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">IP {session.ipAddress}</p>
                  ) : null}
                </div>
                {!session.isCurrent ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() =>
                      void onRevokeSession(session.id)
                        .then(() => {
                          setSessions((prev) => prev.filter((s) => s.id !== session.id));
                          toast.success("Session revoked.");
                        })
                        .catch((e) =>
                          toast.error(e instanceof Error ? e.message : "Could not revoke session")
                        )
                    }
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AppModal>
    </div>
  );
}
