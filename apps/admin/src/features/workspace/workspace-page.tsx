"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppModal,
  AppBar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
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

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
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

    api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws })
      .then((list) => {
        const currentWs = list.find((w) => w.id === ws);
        if (currentWs) {
          setWorkspaceName(currentWs.name || "");
          const settings = currentWs.settings || {};
          setWeekStart(settings.weekStart || "monday");
          setTimesheetApprovalPeriod(settings.timesheetApprovalPeriod || "weekly");
          setExpectedWeeklyHours(settings.expectedWeeklyHours || 40);
          setDailyTargetHours(settings.dailyTargetHours || 8);
          setRoundingMinutes(settings.roundingMinutes || 0);
          setTimezone(
            settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          );
        }
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
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);
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
      setSession(switchRes, switchRes.accessToken);

      const list = await api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: res.id });
      setWorkspaces(list);

      setIsCreateOpen(false);
      toast.success(`Workspace "${res.name}" created.`);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreateLoading(false);
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

      <Card className="max-w-2xl border-primary/10 shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSettings} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. Acme Corp"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekStart">Week Starts On</Label>
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
              <div className="space-y-2">
                <Label htmlFor="timesheetApprovalPeriod">Default Timesheet Approval Period</Label>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expectedWeeklyHours">Expected Weekly Hours</Label>
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
                <Label htmlFor="dailyTargetHours">Daily Target Hours</Label>
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

              <div className="space-y-2">
                <Label htmlFor="roundingMinutes">Time Rounding</Label>
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

            {settingsError && <p className="text-sm text-destructive">{settingsError}</p>}
            {settingsSuccess && <p className="text-sm text-primary">{settingsSuccess}</p>}

            <Button type="submit" disabled={settingsLoading} className="w-full">
              {settingsLoading ? "Saving settings..." : "Save Settings"}
            </Button>
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
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. Design Agency"
              required
              autoFocus
            />
          </div>

          {createError && <p className="text-sm text-destructive font-medium">{createError}</p>}
          {createSuccess && <p className="text-sm text-primary font-medium">{createSuccess}</p>}
        </form>
      </AppModal>
    </div>
  );
}
