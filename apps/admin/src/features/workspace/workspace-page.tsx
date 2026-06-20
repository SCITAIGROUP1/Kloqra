"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { Building2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { validateCreateWorkspaceForm } from "./create-workspace-validation";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";
import { useWorkspacesStore } from "@/stores/workspaces.store";

const DEFAULT_TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Colombo", label: "Asia/Colombo (Sri Lanka)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (New Zealand)" }
];

export function WorkspacePage() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const setWorkspaces = useWorkspacesStore((s) => s.setWorkspaces);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [workspaceName, setWorkspaceName] = useState("");
  const [weekStart, setWeekStart] = useState<"monday" | "sunday">("monday");
  const [timesheetApprovalPeriod, setTimesheetApprovalPeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");
  const [expectedWeeklyHours, setExpectedWeeklyHours] = useState(40);
  const [dailyTargetHours, setDailyTargetHours] = useState(8);
  const [roundingMinutes, setRoundingMinutes] = useState(0);
  const [timezone, setTimezone] = useState(() => {
    if (typeof window !== "undefined") {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    }
    return "UTC";
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const [jiraSiteUrl, setJiraSiteUrl] = useState("");
  const [jiraServiceEmail, setJiraServiceEmail] = useState("");
  const [jiraServiceToken, setJiraServiceToken] = useState("");
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [jiraSuccess, setJiraSuccess] = useState<string | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<{ name?: string }>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const timezoneOptions = useMemo(() => {
    const list = [...DEFAULT_TIMEZONES];
    if (timezone && !list.some((opt) => opt.value === timezone)) {
      list.push({ value: timezone, label: `${timezone} (Detected/Current)` });
    }
    return list;
  }, [timezone]);

  useEffect(() => {
    if (!ws) return;

    api<{ id: string; name: string; settings?: Record<string, any> }>(ROUTES.WORKSPACES.BY_ID(ws), {
      workspaceId: ws
    })
      .then((currentWs) => {
        setWorkspaceName(currentWs.name || "");
        const settings = currentWs.settings || {};
        setWeekStart(settings.weekStart || "monday");
        setTimesheetApprovalPeriod(settings.timesheetApprovalPeriod || "weekly");
        setExpectedWeeklyHours(settings.expectedWeeklyHours || 40);
        setDailyTargetHours(settings.dailyTargetHours || 8);
        setRoundingMinutes(settings.roundingMinutes || 0);
        setTimezone(settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
        setJiraSiteUrl(settings.jiraSiteUrl || "");
        setJiraServiceEmail(settings.jiraServiceEmail || "");
      })
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setIsCreateOpen(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      await api(ROUTES.WORKSPACES.BY_ID(ws), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          name: workspaceName.trim(),
          settings: {
            weekStart,
            timesheetApprovalPeriod,
            expectedWeeklyHours,
            dailyTargetHours,
            roundingMinutes,
            timezone
          }
        })
      });
      setSettingsSuccess("Settings saved successfully.");
      toast.success("Workspace settings saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update workspace settings";
      setSettingsError(message);
      toast.error(message);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setCreateFieldErrors({});
    setCreateError(null);
    setCreateSuccess(null);

    const fieldErrors = validateCreateWorkspaceForm(newWorkspaceName);
    if (Object.keys(fieldErrors).length > 0) {
      setCreateFieldErrors(fieldErrors);
      return;
    }

    setCreateLoading(true);
    try {
      const res = await api<any>(ROUTES.WORKSPACES.CREATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          slug: newWorkspaceName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        })
      });
      setCreateSuccess(`Workspace "${res.name}" created! Switching workspace...`);
      setNewWorkspaceName("");

      const switchRes = await api<any>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ workspaceId: res.id })
      });
      setSession(switchRes, switchRes.accessToken, switchRes.refreshToken);

      const list = await api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: res.id });
      setWorkspaces(list);

      setIsCreateOpen(false);
      toast.success(`Workspace "${res.name}" created.`);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      if (message.toLowerCase().includes("already exists")) {
        setCreateFieldErrors({ name: message });
      } else {
        setCreateError(message);
      }
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  }

  function extractAtlassianOrigin(url: string): string {
    try {
      return new URL(url.trim()).origin;
    } catch {
      return url.trim();
    }
  }

  async function saveJiraSettings(e: React.FormEvent) {
    e.preventDefault();
    setJiraLoading(true);
    setJiraError(null);
    setJiraSuccess(null);

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
        workspaceId: ws,
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

      await api(ROUTES.WORKSPACES.BY_ID(ws), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ settings: settingsUpdate })
      });

      const name = verifyRes.displayName ? ` as ${verifyRes.displayName}` : "";
      setJiraSuccess(`Connected successfully${name}. Settings saved.`);
      setJiraServiceToken("");
      toast.success("Jira workspace connection verified and saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect to Jira";
      setJiraError(message);
    } finally {
      setJiraLoading(false);
    }
  }

  async function deleteJiraSettings() {
    if (
      !window.confirm(
        "Remove the Jira integration? This will disconnect all members from Jira until reconfigured."
      )
    )
      return;
    setJiraLoading(true);
    setJiraError(null);
    setJiraSuccess(null);
    try {
      await api(ROUTES.WORKSPACES.BY_ID(ws), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          settings: { jiraSiteUrl: null, jiraServiceEmail: null, jiraServiceToken: null }
        })
      });
      setJiraSiteUrl("");
      setJiraServiceEmail("");
      setJiraServiceToken("");
      toast.success("Jira integration removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove Jira integration");
    } finally {
      setJiraLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Workspace"
        description={
          <>
            Configure settings for <strong>{session?.workspaceName ?? "this workspace"}</strong>.
            Manage members from Team Management.
          </>
        }
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="h-10 gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Workspace
          </Button>
        }
      />

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20">
          <CardTitle className="text-base">Workspace settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={saveSettings} className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Corp"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                      if (localTz) {
                        setTimezone(localTz);
                        toast.info(`Detected timezone: ${localTz}`);
                      }
                    }}
                    className="text-xs text-primary hover:underline font-medium cursor-pointer bg-transparent border-0 p-0"
                  >
                    Use System Timezone
                  </button>
                </div>
                <SearchableSelect
                  id="timezone"
                  value={timezone}
                  onValueChange={setTimezone}
                  options={timezoneOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    keywords: opt.value
                  }))}
                  placeholder="Select timezone"
                  searchPlaceholder="Search timezones…"
                  aria-label="Timezone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekStart">Week starts on</Label>
                <Select
                  value={weekStart}
                  onValueChange={(v) => setWeekStart(v as "monday" | "sunday")}
                >
                  <SelectTrigger id="weekStart">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="timesheetApprovalPeriod">Default timesheet approval period</Label>
                <Select
                  value={timesheetApprovalPeriod}
                  onValueChange={(v) =>
                    setTimesheetApprovalPeriod(v as "daily" | "weekly" | "monthly")
                  }
                >
                  <SelectTrigger id="timesheetApprovalPeriod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used by projects that require approval but do not set their own cadence.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="expectedWeeklyHours">Expected weekly hours</Label>
                <Input
                  id="expectedWeeklyHours"
                  type="number"
                  min={1}
                  max={168}
                  value={expectedWeeklyHours}
                  onChange={(e) => setExpectedWeeklyHours(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyTargetHours">Daily target hours</Label>
                <Input
                  id="dailyTargetHours"
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={dailyTargetHours}
                  onChange={(e) => setDailyTargetHours(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the client timer&apos;s daily progress ring (default: 8 hrs).
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="roundingMinutes">Time rounding</Label>
                <Select
                  value={String(roundingMinutes)}
                  onValueChange={(v) => setRoundingMinutes(Number(v))}
                >
                  <SelectTrigger id="roundingMinutes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No rounding (exact time)</SelectItem>
                    <SelectItem value="15">Nearest 15 minutes</SelectItem>
                    <SelectItem value="30">Nearest 30 minutes</SelectItem>
                    <SelectItem value="60">Nearest 60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {settingsError ? (
              <p className="text-sm text-destructive lg:col-span-2">{settingsError}</p>
            ) : null}
            {settingsSuccess ? (
              <p className="text-sm text-primary lg:col-span-2">{settingsSuccess}</p>
            ) : null}

            <div className="flex justify-end lg:col-span-2">
              <Button type="submit" disabled={settingsLoading} className="min-w-[160px]">
                {settingsLoading ? "Saving settings…" : "Save settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Jira Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jira Integration</CardTitle>
          <CardDescription>
            Connect your Atlassian Jira workspace so members can see their assigned issues when
            logging time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Connected summary — shown when workspace Jira is already configured */}
          {jiraSiteUrl && jiraServiceEmail && !jiraError && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                Currently Configured
              </p>
              <dl className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <dt className="w-32 shrink-0 text-muted-foreground">Site URL</dt>
                  <dd className="font-mono font-medium break-all">{jiraSiteUrl}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-32 shrink-0 text-muted-foreground">Service Email</dt>
                  <dd className="font-mono font-medium">{jiraServiceEmail}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-32 shrink-0 text-muted-foreground">API Token</dt>
                  <dd className="text-muted-foreground italic">saved (hidden)</dd>
                </div>
              </dl>
            </div>
          )}

          <form onSubmit={(e) => void saveJiraSettings(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jira-site-url">Jira Site URL</Label>
              <Input
                id="jira-site-url"
                type="url"
                placeholder="https://your-company.atlassian.net"
                value={jiraSiteUrl}
                onChange={(e) => setJiraSiteUrl(e.target.value)}
                onBlur={(e) => setJiraSiteUrl(extractAtlassianOrigin(e.target.value))}
                disabled={jiraLoading}
              />
              {(() => {
                const cleaned = extractAtlassianOrigin(jiraSiteUrl);
                return cleaned && cleaned !== jiraSiteUrl.trim() ? (
                  <p className="text-xs text-muted-foreground">
                    Will save as: <span className="font-mono font-medium">{cleaned}</span>
                  </p>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jira-service-email">Service Account Email</Label>
              <Input
                id="jira-service-email"
                type="email"
                placeholder="jira-service@company.com"
                value={jiraServiceEmail}
                onChange={(e) => setJiraServiceEmail(e.target.value)}
                disabled={jiraLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jira-service-token">
                API Token{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (leave blank to keep existing)
                </span>
              </Label>
              <Input
                id="jira-service-token"
                type="password"
                placeholder="ATATT3x…"
                value={jiraServiceToken}
                onChange={(e) => setJiraServiceToken(e.target.value)}
                disabled={jiraLoading}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Generate at{" "}
                <span className="font-mono">id.atlassian.com → Security → API tokens</span>
              </p>
            </div>

            {jiraError && <p className="text-sm text-destructive">{jiraError}</p>}
            {jiraSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{jiraSuccess}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={jiraLoading || !jiraSiteUrl.trim() || !jiraServiceEmail.trim()}
              >
                {jiraLoading ? "Verifying…" : "Verify & Save"}
              </Button>
              {(jiraSiteUrl || jiraServiceEmail) && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={jiraLoading}
                  onClick={() => void deleteJiraSettings()}
                >
                  <Trash2 className="mr-2 size-4" />
                  Remove Integration
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <AppModal
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setCreateError(null);
            setCreateSuccess(null);
            setCreateFieldErrors({});
            setNewWorkspaceName("");
          }
        }}
        title="Create workspace"
        description="Create a new workspace to manage a different set of projects, members, and settings."
        icon={<Building2 className="size-5" />}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateError(null);
                setCreateSuccess(null);
                setCreateFieldErrors({});
                setNewWorkspaceName("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="create-workspace-form" disabled={createLoading}>
              {createLoading ? "Creating..." : "Create workspace"}
            </Button>
          </>
        }
      >
        <form id="create-workspace-form" onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newWorkspaceName">Workspace Name</Label>
            <Input
              id="newWorkspaceName"
              value={newWorkspaceName}
              onChange={(e) => {
                setNewWorkspaceName(e.target.value);
                if (createFieldErrors.name) {
                  setCreateFieldErrors({});
                }
              }}
              placeholder="e.g. Design Agency"
              autoFocus
              aria-invalid={Boolean(createFieldErrors.name)}
            />
            {createFieldErrors.name ? (
              <p className="text-xs text-destructive">{createFieldErrors.name}</p>
            ) : null}
          </div>

          {createError && <p className="text-sm text-destructive font-medium">{createError}</p>}
          {createSuccess && <p className="text-sm text-primary font-medium">{createSuccess}</p>}
        </form>
      </AppModal>
    </div>
  );
}
