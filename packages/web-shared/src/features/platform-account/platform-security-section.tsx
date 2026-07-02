"use client";

import type { PlatformUserProfileDto, UserSessionDto } from "@kloqra/contracts";
import { AppModal, Button, Input, Label, PasswordInput, Spinner } from "@kloqra/ui";
import { Activity, KeyRound, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChangePasswordModal } from "../account/change-password-modal";
import { formatSessionDevice } from "../account/settings/format-session-device";
import { TwoFaSetupPanel } from "../account/settings/sections/two-fa-setup-panel";
import { SettingsCard } from "../account/settings/settings-card";

export function PlatformSecuritySection({
  profile,
  onChangePassword,
  onEnable2fa,
  onVerify2fa,
  onDisable2fa,
  onListSessions,
  onRevokeSession,
  onRevokeOtherSessions
}: {
  profile: PlatformUserProfileDto;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onEnable2fa: () => Promise<{ secret: string; otpauthUrl: string }>;
  onVerify2fa: (code: string) => Promise<void>;
  onDisable2fa: (currentPassword: string, code: string) => Promise<void>;
  onListSessions: () => Promise<UserSessionDto[]>;
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeOtherSessions: () => Promise<{ revoked: number }>;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFaOpen, setTwoFaOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [twoFaOtpauthUrl, setTwoFaOtpauthUrl] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const otherSessions = sessions.filter((session) => !session.isCurrent);

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

  function resetTwoFaSetup() {
    setTwoFaSecret(null);
    setTwoFaOtpauthUrl(null);
    setTwoFaCode("");
  }

  async function handleEnable2fa() {
    try {
      const result = await onEnable2fa();
      setTwoFaSecret(result.secret);
      setTwoFaOtpauthUrl(result.otpauthUrl);
      setTwoFaOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start 2FA setup");
    }
  }

  async function handleVerify2fa() {
    try {
      await onVerify2fa(twoFaCode);
      setTwoFaOpen(false);
      resetTwoFaSetup();
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
      setTwoFaOpen(false);
      toast.success("Two-factor authentication disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disable 2FA");
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        icon={KeyRound}
        title="Change Password"
        description="Update your platform admin password to keep your account secure."
        action={
          <Button type="button" onClick={() => setPasswordOpen(true)}>
            Change Password
          </Button>
        }
      />

      <SettingsCard
        icon={Shield}
        title="Two-Factor Authentication"
        description="Required for platform console access."
        action={
          profile.twoFactorEnabled ? (
            <Button type="button" variant="outline" onClick={() => setTwoFaOpen(true)}>
              Manage 2FA
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleEnable2fa()}>
              Enable
            </Button>
          )
        }
      />

      <SettingsCard
        icon={Activity}
        title="Active Sessions"
        description="Review and manage devices signed in to this platform account."
        action={
          <Button type="button" onClick={() => void openSessions()}>
            View Sessions
          </Button>
        }
      />

      <ChangePasswordModal
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onChangePassword={onChangePassword}
      />

      <AppModal
        open={twoFaOpen}
        onOpenChange={(open) => {
          setTwoFaOpen(open);
          if (!open) resetTwoFaSetup();
        }}
        title={profile.twoFactorEnabled ? "Manage two-factor authentication" : "Enable 2FA"}
        description={
          profile.twoFactorEnabled
            ? "Disable 2FA by confirming your password and authentication code."
            : "Scan the QR code with your authenticator app, then verify with a code."
        }
        icon={<Shield className="size-5" />}
        size="lg"
        footer={
          !profile.twoFactorEnabled && twoFaSecret && twoFaOtpauthUrl ? (
            <div className="flex w-full justify-end">
              <Button
                type="button"
                onClick={() => void handleVerify2fa()}
                disabled={twoFaCode.length !== 6}
              >
                Verify and enable
              </Button>
            </div>
          ) : undefined
        }
      >
        {profile.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Current password</Label>
              <PasswordInput
                id="disable-password"
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
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <Button type="button" variant="destructive" onClick={() => void handleDisable2fa()}>
              Disable two-factor authentication
            </Button>
          </div>
        ) : twoFaSecret && twoFaOtpauthUrl ? (
          <TwoFaSetupPanel
            secret={twoFaSecret}
            otpauthUrl={twoFaOtpauthUrl}
            code={twoFaCode}
            onCodeChange={setTwoFaCode}
          />
        ) : null}
      </AppModal>

      <AppModal open={sessionsOpen} onOpenChange={setSessionsOpen} title="Active sessions">
        {loadingSessions ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatSessionDevice(session.userAgent)}
                    {session.isCurrent ? " (this device)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active {new Date(session.lastUsedAt).toLocaleString()}
                  </p>
                </div>
                {!session.isCurrent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void onRevokeSession(session.id).then(() => {
                        setSessions((prev) => prev.filter((item) => item.id !== session.id));
                        toast.success("Session revoked");
                      })
                    }
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
            ))}
            {otherSessions.length > 0 ? (
              <Button
                type="button"
                variant="destructive"
                disabled={revokingOthers}
                onClick={() => {
                  setRevokingOthers(true);
                  void onRevokeOtherSessions()
                    .then(({ revoked }) => {
                      toast.success(`Revoked ${revoked} session(s)`);
                      return openSessions();
                    })
                    .finally(() => setRevokingOthers(false));
                }}
              >
                {revokingOthers ? "Revoking…" : "Sign out other devices"}
              </Button>
            ) : null}
          </div>
        )}
      </AppModal>
    </div>
  );
}
