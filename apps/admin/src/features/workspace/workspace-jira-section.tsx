"use client";

import { ROUTES } from "@kloqra/contracts";
import { Badge, Button, ConfirmDialog, Input, Label } from "@kloqra/ui";
import { CheckCircle2, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { extractAtlassianOrigin } from "./jira-url";
import { WorkspaceSectionCard } from "./workspace-section-card";
import { api } from "@/lib/api";

type WorkspaceJiraSectionProps = {
  workspaceId: string;
  jiraSiteUrl: string;
  jiraServiceEmail: string;
  onSiteUrlChange: (value: string) => void;
  onServiceEmailChange: (value: string) => void;
  onDisconnected: () => void;
};

export function WorkspaceJiraSection({
  workspaceId,
  jiraSiteUrl,
  jiraServiceEmail,
  onSiteUrlChange,
  onServiceEmailChange,
  onDisconnected
}: WorkspaceJiraSectionProps) {
  const [jiraServiceToken, setJiraServiceToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isConfigured = Boolean(jiraSiteUrl.trim() && jiraServiceEmail.trim());
  const cleanedSiteUrl = extractAtlassianOrigin(jiraSiteUrl);
  const showUrlHint = cleanedSiteUrl && cleanedSiteUrl !== jiraSiteUrl.trim();

  async function saveJiraSettings(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const siteUrl = extractAtlassianOrigin(jiraSiteUrl);
    const serviceEmail = jiraServiceEmail.trim();
    const token = jiraServiceToken.trim();

    try {
      const verifyBody: Record<string, string> = {
        jiraSiteUrl: siteUrl,
        jiraServiceEmail: serviceEmail
      };
      if (token) verifyBody.jiraServiceToken = token;

      const verifyRes = await api<{ ok: boolean; displayName?: string }>(ROUTES.JIRA.VERIFY, {
        method: "POST",
        workspaceId,
        body: JSON.stringify(verifyBody)
      });

      if (!verifyRes.ok) {
        throw new Error("Jira verification failed — please check your credentials");
      }

      const settingsUpdate: Record<string, string | null> = {
        jiraSiteUrl: siteUrl || null,
        jiraServiceEmail: serviceEmail || null
      };
      if (token) settingsUpdate.jiraServiceToken = token;

      await api(ROUTES.WORKSPACES.BY_ID(workspaceId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ settings: settingsUpdate })
      });

      const name = verifyRes.displayName ? ` as ${verifyRes.displayName}` : "";
      setJiraServiceToken("");
      toast.success(`Jira connected${name}. Workspace settings saved.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect to Jira";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteJiraSettings() {
    setConfirmRemove(false);
    setLoading(true);
    setError(null);
    try {
      await api(ROUTES.WORKSPACES.BY_ID(workspaceId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({
          settings: { jiraSiteUrl: null, jiraServiceEmail: null, jiraServiceToken: null }
        })
      });
      onDisconnected();
      toast.success("Jira integration removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove Jira integration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <WorkspaceSectionCard
        title="Jira integration"
        description="Connect your Atlassian site so members can link accounts and see assigned issues when logging time."
        status={{
          label: isConfigured ? "Connected" : "Not configured",
          connected: isConfigured
        }}
      >
        {isConfigured ? (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dl className="min-w-0 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Site URL</dt>
                <dd className="font-mono font-medium break-all">{jiraSiteUrl}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Service account</dt>
                <dd className="font-medium">{jiraServiceEmail}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-muted-foreground">API token</dt>
                <dd>
                  <Badge variant="secondary" className="font-normal">
                    Saved
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Members cannot link Jira until workspace credentials are configured below.
            </p>
          </div>
        )}

        <form onSubmit={(e) => void saveJiraSettings(e)} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="jira-site-url">Jira site URL</Label>
              <Input
                id="jira-site-url"
                type="url"
                placeholder="https://your-company.atlassian.net"
                value={jiraSiteUrl}
                onChange={(e) => onSiteUrlChange(e.target.value)}
                onBlur={(e) => onSiteUrlChange(extractAtlassianOrigin(e.target.value))}
                disabled={loading}
              />
              {showUrlHint ? (
                <p className="text-xs text-muted-foreground">
                  Will save as: <span className="font-mono font-medium">{cleanedSiteUrl}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jira-service-email">Service account email</Label>
              <Input
                id="jira-service-email"
                type="email"
                placeholder="jira-service@company.com"
                value={jiraServiceEmail}
                onChange={(e) => onServiceEmailChange(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jira-service-token">
                API token{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {isConfigured ? "(leave blank to keep existing)" : ""}
                </span>
              </Label>
              <Input
                id="jira-service-token"
                type="password"
                placeholder="ATATT3x…"
                value={jiraServiceToken}
                onChange={(e) => setJiraServiceToken(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Generate a token at id.atlassian.com → Security → API tokens. Use a dedicated service
            account with read access to issues.
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isConfigured ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setConfirmRemove(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Remove integration
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={loading || !jiraSiteUrl.trim() || !jiraServiceEmail.trim()}
              className="min-w-[160px] gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Verifying…
                </>
              ) : (
                "Verify & save"
              )}
            </Button>
          </div>
        </form>
      </WorkspaceSectionCard>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove Jira integration?"
        description="Members will lose Jira issue suggestions until you configure credentials again."
        confirmLabel="Remove integration"
        destructive
        onConfirm={() => void deleteJiraSettings()}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  );
}
