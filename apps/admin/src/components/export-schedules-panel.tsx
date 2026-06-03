"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import {
  ROUTES,
  type CreateExportScheduleDto,
  type ExportBodyDto,
  type ExportScheduleDto
} from "@chronomint/contracts";
import { api } from "@/lib/api";

type Props = {
  workspaceId: string;
  currentBody: ExportBodyDto;
};

export function ExportSchedulesPanel({ workspaceId, currentBody }: Props) {
  const [schedules, setSchedules] = useState<ExportScheduleDto[]>([]);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<CreateExportScheduleDto["frequency"]>("weekly");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!workspaceId) return;
    api<ExportScheduleDto[]>(ROUTES.EXPORT.SCHEDULES, { workspaceId }).then(setSchedules).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSchedule() {
    setError(null);
    setSaving(true);
    try {
      const recipientEmails = emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      if (recipientEmails.length === 0) {
        setError("Enter at least one email.");
        return;
      }
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
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchedule(s: ExportScheduleDto) {
    await api(ROUTES.EXPORT.SCHEDULE(s.id), {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({ enabled: !s.enabled })
    });
    load();
  }

  async function deleteSchedule(id: string) {
    await api(ROUTES.EXPORT.SCHEDULE(id), { method: "DELETE", workspaceId });
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scheduled exports</CardTitle>
        <CardDescription>
          Email recurring exports using your current filters and report selection (server logs runs when
          email is not configured).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2 min-w-[160px]">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly payroll" />
          </div>
          <div className="space-y-2 min-w-[120px]">
            <Label>Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as CreateExportScheduleDto["frequency"])}
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
            />
          </div>
        </div>
        <Button type="button" onClick={createSchedule} disabled={saving}>
          {saving ? "Saving…" : "Create schedule from current settings"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {schedules.length > 0 ? (
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
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleSchedule(s)}>
                    {s.enabled ? "Pause" : "Enable"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => deleteSchedule(s.id)}>
                    Delete
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
