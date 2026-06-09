"use client";

import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR, ROUTES } from "@chronomint/contracts";
import type { ProjectDto } from "@chronomint/contracts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ProjectColorEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import { useEffect, useState } from "react";
import { useProjectDetail } from "./project-detail-context";
import { api } from "@/lib/api";

export function ProjectSettingsTab() {
  const { workspaceId, projectId, project, setProject } = useProjectDetail();
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editApprovalEnabled, setEditApprovalEnabled] = useState(false);
  const [editApprovalPeriod, setEditApprovalPeriod] = useState<"daily" | "weekly" | "monthly" | "">(
    ""
  );
  const [error, setError] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [savingColor, setSavingColor] = useState(false);

  useEffect(() => {
    if (!project) return;
    setEditName(project.name);
    setEditClient(project.clientName ?? "");
    setEditIsActive(project.isActive);
    setEditApprovalEnabled(project.timesheetApprovalEnabled);
    setEditApprovalPeriod(project.timesheetApprovalPeriod ?? "");
  }, [project]);

  if (!project) return null;

  async function saveProject(e: React.FormEvent) {
    e.preventDefault();
    setSavingProject(true);
    setError(null);
    try {
      const updated = await api<ProjectDto>(ROUTES.PROJECTS.BY_ID(projectId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({
          name: editName.trim(),
          clientName: editClient.trim() || undefined,
          isActive: editIsActive,
          timesheetApprovalEnabled: editApprovalEnabled,
          timesheetApprovalPeriod: editApprovalPeriod || undefined
        })
      });
      setProject(updated);
    } catch {
      setError("Could not save project.");
    } finally {
      setSavingProject(false);
    }
  }

  async function updateProjectColor(color: string) {
    setSavingColor(true);
    setError(null);
    try {
      const updated = await api<ProjectDto>(ROUTES.PROJECTS.BY_ID(projectId), {
        method: "PATCH",
        workspaceId,
        body: JSON.stringify({ color })
      });
      setProject(updated);
    } catch {
      setError("Could not update project color.");
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProject} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
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
              {editApprovalEnabled && (
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
              )}
            </div>

            <Button type="submit" disabled={savingProject}>
              {savingProject ? "Saving…" : "Save settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProjectColorEditor
            value={project.color ?? DEFAULT_PROJECT_COLOR}
            onChange={updateProjectColor}
            colors={PROJECT_COLORS}
          />
          {savingColor ? <p className="text-xs text-muted-foreground">Saving color…</p> : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive lg:col-span-2">{error}</p> : null}
    </div>
  );
}
