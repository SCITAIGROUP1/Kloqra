"use client";

import { ROUTES, type UserProfileDto, type VerifyUserJiraResponseDto } from "@kloqra/contracts";
import { Button, Input, Label } from "@kloqra/ui";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../api/client";
import { getWorkspaceId, useSessionStore } from "../../../stores/session.store";

type VerifyState =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "verified"; displayName: string; accountId: string }
  | { status: "error"; message: string };

export function IntegrationsSection({
  profile,
  onSave
}: {
  profile: UserProfileDto;
  onSave: (data: { jiraEmail: string | null }) => Promise<void>;
}) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [jiraEmail, setJiraEmail] = useState(profile.jiraEmail ?? "");
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: "idle" });
  const [saving, setSaving] = useState(false);

  const emailMatchesProfile = jiraEmail.trim().toLowerCase() === profile.email.toLowerCase();
  const isAlreadySaved = profile.jiraEmail === jiraEmail.trim() && !!profile.jiraEmail;
  const isConnected = profile.jiraConnected;

  useEffect(() => {
    setJiraEmail(profile.jiraEmail ?? "");
    setVerifyState({ status: "idle" });
  }, [profile.jiraEmail]);

  function handleEmailChange(value: string) {
    setJiraEmail(value);
    if (verifyState.status === "verified" || verifyState.status === "error") {
      setVerifyState({ status: "idle" });
    }
  }

  async function handleVerifyAndSave() {
    const email = jiraEmail.trim();
    if (!email) return;

    setVerifyState({ status: "verifying" });
    setSaving(true);

    try {
      const result = await api<VerifyUserJiraResponseDto>(ROUTES.JIRA.VERIFY_USER, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ jiraEmail: email })
      });

      setVerifyState({
        status: "verified",
        displayName: result.displayName,
        accountId: result.accountId
      });

      await onSave({ jiraEmail: email });
      toast.success(`Jira account linked — ${result.displayName}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not verify Jira email";
      setVerifyState({ status: "error", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    try {
      await onSave({ jiraEmail: null });
      setJiraEmail("");
      setVerifyState({ status: "idle" });
      toast.success("Jira account unlinked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not unlink Jira");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Jira Integration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Link your Jira account so assigned ticket titles appear when logging time.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isConnected ? "Connected" : "Not connected"}
        </span>
      </div>

      {profile.workspaceJiraSiteUrl ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 text-sm">
            <span className="text-muted-foreground">Workspace connected to: </span>
            <span className="font-mono font-medium break-all">{profile.workspaceJiraSiteUrl}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Jira is not configured for this workspace yet. Ask your admin to set it up in the
            workspace settings.
          </p>
        </div>
      )}

      {isConnected && isAlreadySaved && verifyState.status === "idle" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
          <div className="text-sm text-green-700 dark:text-green-300">
            <span className="font-medium">Already verified.</span> Your Jira account{" "}
            <span className="font-mono">{profile.jiraEmail}</span> is linked to this workspace.
            {emailMatchesProfile && (
              <span className="ml-1 font-medium">(matches your ChronoMint email)</span>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        <Label htmlFor="jira-email">Your Jira Email</Label>
        <Input
          id="jira-email"
          type="email"
          placeholder="you@company.com"
          value={jiraEmail}
          onChange={(e) => handleEmailChange(e.target.value)}
          disabled={saving}
        />
        {emailMatchesProfile && jiraEmail.trim() && (
          <p className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="size-3.5" />
            This matches your ChronoMint login email.
          </p>
        )}
        {!isConnected && !profile.jiraEmail && (
          <p className="text-xs text-muted-foreground">
            Enter the email you use to log in to your company&apos;s Jira. Make sure your admin has
            configured the Jira workspace connection first.
          </p>
        )}
      </div>

      {verifyState.status === "verifying" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking Jira for this email…
        </div>
      )}

      {verifyState.status === "verified" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
          <div className="text-sm text-green-700 dark:text-green-300">
            <span className="font-medium">Verified!</span> Found Jira user{" "}
            <span className="font-medium">{verifyState.displayName}</span>.
            {emailMatchesProfile && (
              <span className="ml-1">Your ChronoMint and Jira emails match.</span>
            )}
          </div>
        </div>
      )}

      {verifyState.status === "error" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <XCircle className="size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{verifyState.message}</p>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          onClick={() => void handleVerifyAndSave()}
          disabled={saving || !jiraEmail.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {verifyState.status === "verifying" ? "Verifying…" : "Saving…"}
            </>
          ) : isAlreadySaved ? (
            "Re-verify & Save"
          ) : (
            "Verify & Save"
          )}
        </Button>

        {profile.jiraEmail && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDisconnect()}
            disabled={saving}
          >
            Unlink
          </Button>
        )}
      </div>
    </div>
  );
}
