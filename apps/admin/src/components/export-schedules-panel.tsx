"use client";

import {
  ROUTES,
  type CreateExportScheduleDto,
  type ExportBodyDto,
  type ExportScheduleDto
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
};

export function ExportSchedulesPanel({ workspaceId, currentBody }: Props) {
  const [schedules, setSchedules] = useState<ExportScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<CreateExportScheduleDto["frequency"]>("weekly");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
          Email recurring exports using your current filters and report selection (server logs runs
          when email is not configured).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2 min-w-[160px]">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly payroll"
              disabled={saving}
            />
          </div>
          <div className="space-y-2 min-w-[120px]">
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
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Recipient emails (comma-separated)</Label>
            <Input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="ops@company.com, finance@company.com"
              disabled={saving}
            />
          </div>
        </div>
        <Button type="button" onClick={() => void createSchedule()} disabled={saving || loading}>
          {saving ? "Saving…" : "Create schedule from current settings"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <CenteredLoader label="Loading schedules…" className="py-8" />
        ) : schedules.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span>
                  <strong>{s.name}</strong> · {s.frequency} · {s.enabled ? "enabled" : "paused"}
                  {s.lastRunStatus ? ` · last: ${s.lastRunStatus}` : ""}
                </span>
                <span className="flex gap-2">
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
