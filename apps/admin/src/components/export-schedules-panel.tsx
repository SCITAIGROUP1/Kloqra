"use client";

import {
  ROUTES,
  type CreateExportScheduleDto,
  type ExportBodyDto,
  type ExportScheduleDto,
  type UpdateExportScheduleDto
} from "@kloqra/contracts";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CenteredLoader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from "@kloqra/ui";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Props = {
  workspaceId: string;
  currentBody: ExportBodyDto;
  memberEmails?: string[];
};

function formatNextRun(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function ExportSchedulesPanel({ workspaceId, currentBody, memberEmails = [] }: Props) {
  const [schedules, setSchedules] = useState<ExportScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<CreateExportScheduleDto["frequency"]>("weekly");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFrequency, setEditFrequency] =
    useState<CreateExportScheduleDto["frequency"]>("weekly");
  const [editEmails, setEditEmails] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await api<ExportScheduleDto[]>(ROUTES.EXPORT.SCHEDULES, { workspaceId });
      setSchedules(list);
      setError(null);
    } catch (e) {
      setSchedules([]);
      const message = e instanceof Error ? e.message : "Could not load export schedules.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSchedule() {
    setError(null);
    const recipientEmails = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipientEmails.length === 0) {
      const message = "Enter at least one email.";
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    try {
      await api(ROUTES.EXPORT.SCHEDULES, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({
          name: name || "Scheduled export",
          frequency,
          recipientEmails,
          body: currentBody,
          enabled: true
        } satisfies CreateExportScheduleDto)
      });
      setName("");
      setEmails("");
      toast.success("Export schedule created.");
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create schedule";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(schedule: ExportScheduleDto) {
    setEditingId(schedule.id);
    setEditName(schedule.name);
    setEditFrequency(schedule.frequency);
    setEditEmails(schedule.recipientEmails.join(", "));
  }

  async function saveEdit(scheduleId: string) {
    const recipientEmails = editEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipientEmails.length === 0) {
      toast.error("Enter at least one email.");
      return;
    }
    setBusyId(scheduleId);
    try {
      await api(ROUTES.EXPORT.SCHEDULE(scheduleId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({
          name: editName,
          frequency: editFrequency,
          recipientEmails
        } satisfies UpdateExportScheduleDto)
      });
      toast.success("Schedule updated.");
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update schedule.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSchedule(schedule: ExportScheduleDto) {
    setBusyId(schedule.id);
    setError(null);
    try {
      await api(ROUTES.EXPORT.SCHEDULE(schedule.id), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ enabled: !schedule.enabled })
      });
      toast.success(schedule.enabled ? "Schedule paused." : "Schedule enabled.");
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update schedule.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSchedule(schedule: ExportScheduleDto) {
    setBusyId(schedule.id);
    setError(null);
    try {
      await api(ROUTES.EXPORT.SCHEDULE(schedule.id), { method: "DELETE", workspaceId });
      toast.success(`"${schedule.name}" deleted.`);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not delete schedule.";
      setError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scheduled exports</CardTitle>
        <CardDescription>
          Email recurring exports on a schedule. Files use the same naming as manual downloads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1 basis-[140px] space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly payroll"
              disabled={saving}
            />
          </div>
          <div className="min-w-0 flex-1 basis-[120px] space-y-2">
            <Label>Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as CreateExportScheduleDto["frequency"])}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-[2] basis-[200px] space-y-2">
            <Label>Recipient emails (comma-separated)</Label>
            <Input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="ops@company.com, finance@company.com"
              disabled={saving}
            />
          </div>
        </div>
        {memberEmails.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {memberEmails.slice(0, 8).map((email) => (
              <Button
                key={email}
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full text-xs"
                onClick={() =>
                  setEmails((cur) => {
                    const parts = cur
                      .split(",")
                      .map((e) => e.trim())
                      .filter(Boolean);
                    if (parts.includes(email)) return cur;
                    return parts.length ? `${cur}, ${email}` : email;
                  })
                }
              >
                + {email}
              </Button>
            ))}
          </div>
        ) : null}
        <Button type="button" onClick={() => void createSchedule()} disabled={saving || loading}>
          {saving ? "Saving…" : "Create schedule from current settings"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <CenteredLoader label="Loading schedules…" className="py-8" />
        ) : schedules.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {schedules.map((s) => (
              <li key={s.id} className="rounded-md border px-3 py-2 space-y-2">
                {editingId === s.id ? (
                  <div className="space-y-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <Select
                      value={editFrequency}
                      onValueChange={(v) =>
                        setEditFrequency(v as CreateExportScheduleDto["frequency"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={editEmails} onChange={(e) => setEditEmails(e.target.value)} />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === s.id}
                        onClick={() => void saveEdit(s.id)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong>{s.name}</strong> · {s.frequency} ·{" "}
                        {s.enabled ? "active" : "paused"}
                        <span className="block text-xs text-muted-foreground">
                          Next run: {formatNextRun(s.nextRunAt)}
                          {s.lastRunStatus
                            ? ` · Last run: ${s.lastRunStatus}${s.lastRunError ? ` (${s.lastRunError})` : ""}`
                            : ""}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === s.id}
                          onClick={() => startEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === s.id}
                          onClick={() => void toggleSchedule(s)}
                        >
                          {busyId === s.id ? <Spinner size="sm" /> : s.enabled ? "Pause" : "Enable"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === s.id}
                          onClick={() => void deleteSchedule(s)}
                        >
                          Delete
                        </Button>
                      </span>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No scheduled exports yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
