"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  AppBar,
  Button,
  Input,
  Label,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { validateCreateWorkspaceForm } from "./create-workspace-validation";
import { WorkspaceJiraSection } from "./workspace-jira-section";
import { WorkspaceSectionCard } from "./workspace-section-card";
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

  const [jiraSiteUrl, setJiraSiteUrl] = useState("");
  const [jiraServiceEmail, setJiraServiceEmail] = useState("");

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

    api<{ id: string; name: string; settings?: Record<string, unknown> }>(
      ROUTES.WORKSPACES.BY_ID(ws),
      { workspaceId: ws }
    )
      .then((currentWs) => {
        setWorkspaceName(currentWs.name || "");
        const settings = currentWs.settings || {};
        setWeekStart((settings.weekStart as "monday" | "sunday") || "monday");
        setTimesheetApprovalPeriod(
          (settings.timesheetApprovalPeriod as "daily" | "weekly" | "monthly") || "weekly"
        );
        setExpectedWeeklyHours(Number(settings.expectedWeeklyHours) || 40);
        setDailyTargetHours(Number(settings.dailyTargetHours) || 8);
        setRoundingMinutes(Number(settings.roundingMinutes) || 0);
        setTimezone(
          (settings.timezone as string) || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        );
        setJiraSiteUrl((settings.jiraSiteUrl as string) || "");
        setJiraServiceEmail((settings.jiraServiceEmail as string) || "");
      })
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        router.replace("/account/workspaces");
      }
    }
  }, [router]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError(null);
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
      const res = await api<{ id: string; name: string }>(ROUTES.WORKSPACES.CREATE, {
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

  return (
    <div className="space-y-6">
      <AppBar
        title="Workspace settings"
        description={
          <>
            Configure settings for <strong>{session?.workspaceName ?? "this workspace"}</strong>.
            Manage members from Team Management.
          </>
        }
        actions={
          session?.tenantRole === "OWNER" ? (
            <Button asChild className="h-10 gap-1.5 shadow-sm">
              <Link href="/account/workspaces">
                <Plus className="h-4 w-4" />
                Manage workspaces
              </Link>
            </Button>
          ) : undefined
        }
      />

      <WorkspaceSectionCard
        title="General settings"
        description="Timezone, timesheet defaults, and hour targets for this workspace."
      >
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
                className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-primary hover:underline"
              >
                Use system timezone
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
            <Select value={weekStart} onValueChange={(v) => setWeekStart(v as "monday" | "sunday")}>
              <SelectTrigger id="weekStart">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="timesheetApprovalPeriod">Default timesheet approval period</Label>
            <Select
              value={timesheetApprovalPeriod}
              onValueChange={(v) => setTimesheetApprovalPeriod(v as "daily" | "weekly" | "monthly")}
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

          <div className="space-y-2 lg:col-span-2">
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

          {settingsError ? (
            <p className="text-sm text-destructive lg:col-span-2">{settingsError}</p>
          ) : null}

          <div className="flex justify-end lg:col-span-2">
            <Button type="submit" disabled={settingsLoading} className="min-w-[160px]">
              {settingsLoading ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </WorkspaceSectionCard>

      <WorkspaceJiraSection
        workspaceId={ws}
        jiraSiteUrl={jiraSiteUrl}
        jiraServiceEmail={jiraServiceEmail}
        onSiteUrlChange={setJiraSiteUrl}
        onServiceEmailChange={setJiraServiceEmail}
        onDisconnected={() => {
          setJiraSiteUrl("");
          setJiraServiceEmail("");
        }}
      />

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
              {createLoading ? "Creating…" : "Create workspace"}
            </Button>
          </>
        }
      >
        <form id="create-workspace-form" onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newWorkspaceName">Workspace name</Label>
            <Input
              id="newWorkspaceName"
              value={newWorkspaceName}
              onChange={(e) => {
                setNewWorkspaceName(e.target.value);
                if (createFieldErrors.name) setCreateFieldErrors({});
              }}
              placeholder="e.g. Design Agency"
              autoFocus
              aria-invalid={Boolean(createFieldErrors.name)}
            />
            {createFieldErrors.name ? (
              <p className="text-xs text-destructive">{createFieldErrors.name}</p>
            ) : null}
          </div>

          {createError ? (
            <p className="text-sm font-medium text-destructive">{createError}</p>
          ) : null}
          {createSuccess ? (
            <p className="text-sm font-medium text-primary">{createSuccess}</p>
          ) : null}
        </form>
      </AppModal>
    </div>
  );
}
