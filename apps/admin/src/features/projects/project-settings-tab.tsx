"use client";

import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR, ROUTES } from "@kloqra/contracts";
import type { ProjectDto } from "@kloqra/contracts";
import {
  Button,
  ConfirmDialog,
  Input,
  Label,
  ProjectColorEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@kloqra/ui";
import { SettingsCard, SettingsSaveBar, extractFieldErrorsFromMessage } from "@kloqra/web-shared";
import { Palette, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProjectDetail } from "./project-detail-context";
import { api } from "@/lib/api";

type ProjectFormSnapshot = {
  name: string;
  client: string;
  isActive: boolean;
  approvalEnabled: boolean;
  approvalPeriod: "" | "daily" | "weekly" | "monthly";
  color: string;
};

function snapshotFromProject(project: ProjectDto): ProjectFormSnapshot {
  return {
    name: project.name,
    client: project.clientName ?? "",
    isActive: project.isActive,
    approvalEnabled: project.timesheetApprovalEnabled ?? false,
    approvalPeriod: project.timesheetApprovalPeriod ?? "",
    color: project.color ?? DEFAULT_PROJECT_COLOR
  };
}

export function ProjectSettingsTab() {
  const { workspaceId, projectId, project, setProject } = useProjectDetail();
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editApprovalEnabled, setEditApprovalEnabled] = useState(false);
  const [editApprovalPeriod, setEditApprovalPeriod] = useState<"daily" | "weekly" | "monthly" | "">(
    ""
  );
  const [editColor, setEditColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [snapshot, setSnapshot] = useState<ProjectFormSnapshot | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [approvalConfirmOpen, setApprovalConfirmOpen] = useState(false);
  const [pendingSaveEvent, setPendingSaveEvent] = useState<React.FormEvent | null>(null);

  useEffect(() => {
    if (!project) return;
    const next = snapshotFromProject(project);
    setEditName(next.name);
    setEditClient(next.client);
    setEditIsActive(next.isActive);
    setEditApprovalEnabled(next.approvalEnabled);
    setEditApprovalPeriod(next.approvalPeriod);
    setEditColor(next.color);
    setSnapshot(next);
  }, [project]);

  if (!project) return null;

  const isDirty =
    snapshot !== null &&
    (editName.trim() !== snapshot.name ||
      editClient.trim() !== snapshot.client ||
      editIsActive !== snapshot.isActive ||
      editApprovalEnabled !== snapshot.approvalEnabled ||
      editApprovalPeriod !== snapshot.approvalPeriod ||
      editColor !== snapshot.color);

  const approvalSettingsDirty =
    snapshot !== null &&
    (editApprovalEnabled !== snapshot.approvalEnabled ||
      editApprovalPeriod !== snapshot.approvalPeriod);

  async function performSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const updated = await api<ProjectDto>(ROUTES.PROJECTS.BY_ID(projectId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({
          name: editName.trim(),
          clientName: editClient.trim() || undefined,
          isActive: editIsActive,
          timesheetApprovalEnabled: editApprovalEnabled,
          timesheetApprovalPeriod: editApprovalPeriod || undefined,
          color: editColor
        })
      });
      setProject(updated);
      const next = snapshotFromProject(updated);
      setSnapshot(next);
      toast.success("Project settings saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save project settings.";
      const parsed = extractFieldErrorsFromMessage<"name">(message, { name: "Name" });
      setFieldErrors(parsed.fieldErrors);
      setFormError(
        parsed.formError || (Object.keys(parsed.fieldErrors).length === 0 ? message : null)
      );
    } finally {
      setSaving(false);
      setApprovalConfirmOpen(false);
      setPendingSaveEvent(null);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (approvalSettingsDirty) {
      setPendingSaveEvent(e);
      setApprovalConfirmOpen(true);
      return;
    }
    void performSave(e);
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
      <SettingsCard
        icon={Settings2}
        title="General"
        description="Project name, client, visibility, and timesheet approval."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (fieldErrors.name) setFieldErrors({});
                  if (formError) setFormError(null);
                }}
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client">Client</Label>
              <Input
                id="edit-client"
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border border-input accent-primary"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
            <span>Project is active (inactive projects are hidden from members)</span>
          </label>

          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-medium">Timesheet approval</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border border-input accent-primary"
                checked={editApprovalEnabled}
                onChange={(e) => setEditApprovalEnabled(e.target.checked)}
              />
              <span>Require timesheet approval</span>
            </label>
            {editApprovalEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="approval-period">Approval period</Label>
                <Select
                  value={editApprovalPeriod || "default"}
                  onValueChange={(v) =>
                    setEditApprovalPeriod(
                      v === "default" ? "" : (v as "daily" | "weekly" | "monthly")
                    )
                  }
                >
                  <SelectTrigger id="approval-period">
                    <SelectValue placeholder="Use workspace default (weekly)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Workspace default (weekly)</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Members must submit and get approval before entries on this project are locked.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Palette}
        title="Appearance"
        description="Project color shown in timers, timesheets, and reports."
      >
        <ProjectColorEditor value={editColor} onChange={setEditColor} colors={PROJECT_COLORS} />
      </SettingsCard>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <SettingsSaveBar saving={saving} disabled={!isDirty}>
        <Button type="submit" disabled={!isDirty || saving} className="gap-2">
          <Save className="size-4" aria-hidden />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </SettingsSaveBar>

      <ConfirmDialog
        open={approvalConfirmOpen}
        title="Update timesheet approval settings?"
        description="Open draft and rejected timesheets on this project will be waived. Members only need to submit from the current period onward — no backlog catch-up is required."
        confirmLabel="Save changes"
        onConfirm={() => {
          if (pendingSaveEvent) void performSave(pendingSaveEvent);
        }}
        onCancel={() => {
          setApprovalConfirmOpen(false);
          setPendingSaveEvent(null);
        }}
      />
    </form>
  );
}
