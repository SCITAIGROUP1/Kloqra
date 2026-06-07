"use client";

import { ROUTES } from "@chronomint/contracts";
import type { WorkspaceMemberDto } from "@chronomint/contracts";
import {
  Badge,
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
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SegmentedControl,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel
} from "@chronomint/ui";
import { Plus } from "lucide-react";
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
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  async function handleImpersonate(userId: string) {
    setImpersonatingId(userId);
    try {
      await api(ROUTES.AUTH.IMPERSONATE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ userId })
      });
      toast.success("Impersonation cookies set. Redirecting to Client...");
      const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000";
      window.location.href = `${clientUrl}/timer?impersonate=true`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to view as member");
    } finally {
      setImpersonatingId(null);
    }
  }

  // Tab State
  const [tab, setTab] = useState<"members" | "settings">("members");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Settings State
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

  const timezoneOptions = useMemo(() => {
    const list = [...DEFAULT_TIMEZONES];
    if (timezone && !list.some((opt) => opt.value === timezone)) {
      list.push({ value: timezone, label: `${timezone} (Detected/Current)` });
    }
    return list;
  }, [timezone]);

  // Create Workspace State
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!ws) return;
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws })
      .then(setMembers)
      .catch(() => setMembers([]));

    // Load workspace details for settings
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
        // Clear the query parameter so refreshing doesn't re-open it
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
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to update workspace settings");
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

      // Switch to the newly created workspace
      const switchRes = await api<any>(ROUTES.AUTH.SWITCH_WORKSPACE, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ workspaceId: res.id })
      });
      setSession(switchRes, switchRes.accessToken);

      // Load new list of workspaces
      const list = await api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: res.id });
      setWorkspaces(list);

      // Close the modal
      setIsCreateOpen(false);

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setCreateLoading(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await api(ROUTES.WORKSPACES.INVITE(ws), {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ email: email.trim(), role })
      });
      setEmail("");
      setMessage("Member added to workspace.");
      setMembers(
        await api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws })
      );
    } catch {
      setError("User must register first, or is already a member.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold">Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Manage members and configure settings for{" "}
            <strong>{session?.workspaceName ?? "this workspace"}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "members", label: "Members & Invites" },
              { value: "settings", label: "Workspace Settings" }
            ]}
          />
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Workspace
          </Button>
        </div>
      </div>

      {tab === "members" && (
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Invite member</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={invite} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "MEMBER" | "ADMIN")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {message && <p className="text-sm text-primary">{message}</p>}
                <Button type="submit">Add to workspace</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.userName}</TableCell>
                      <TableCell>{m.userEmail}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {m.userId !== session?.user.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                            onClick={() => handleImpersonate(m.userId)}
                            disabled={impersonatingId !== null}
                          >
                            {impersonatingId === m.userId ? "Entering..." : "View as member"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic mr-2">
                            Current User
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "settings" && (
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
      )}

      {/* Create Workspace Modal */}
      <AlertDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Create Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new workspace to manage a different set of projects, members, and settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 py-2">
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

            <AlertDialogFooter className="pt-2">
              <AlertDialogCancel
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                  setCreateSuccess(null);
                  setNewWorkspaceName("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Workspace"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
