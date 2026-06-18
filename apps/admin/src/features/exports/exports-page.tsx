"use client";

import {
  ROUTES,
  type ExportPresetDto,
  type ExportPreviewBodyDto,
  type ExportPreviewResponseDto,
  type CategoryDto,
  type ProjectDto,
  type TaskDto,
  type WorkspaceMemberDto
} from "@kloqra/contracts";
import { fetchListItems, fetchProjectTeam } from "@kloqra/web-shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExportCustomFlow } from "./export-custom-flow";
import { ExportHistoryPanel } from "./export-history-panel";
import { ExportQuickFlow } from "./export-quick-flow";
import type { ExportScenarioId } from "./export-scenarios";
import { InvoiceWizard } from "./invoice-wizard";
import { AppBar, SegmentedControl } from "@/components/admin-page";
import { api } from "@/lib/api";
import { toDateInputValue } from "@/lib/export-date-presets";
import { normalizeExportPreview } from "@/lib/export-normalize";
import { listLocalExportPresets, type StoredExportPreset } from "@/lib/export-presets";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

type ExportMode = "quick" | "custom" | "invoice";

export function ExportsPage() {
  const session = useSessionStore((s) => s.session);
  const ws = session?.workspaceId ?? getWorkspaceId() ?? "";
  const workspaceSlug = session?.workspaceName ?? "workspace";

  const [exportMode, setExportMode] = useState<ExportMode>("quick");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);

  const [preview, setPreview] = useState<ExportPreviewResponseDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBody, setPreviewBody] = useState<ExportPreviewBodyDto | null>(null);
  const [jobRefreshKey, setJobRefreshKey] = useState(0);
  const [initialScenarioId, setInitialScenarioId] = useState<ExportScenarioId | null>(null);

  const [localPresets, setLocalPresets] = useState<StoredExportPreset[]>([]);
  const [serverPresets, setServerPresets] = useState<ExportPresetDto[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qFrom = params.get("from");
    const qTo = params.get("to");
    const qScenario = params.get("scenario");
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qScenario) setInitialScenarioId(qScenario as ExportScenarioId);
  }, []);

  useEffect(() => {
    if (!ws) return;
    fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(setCategories);
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(setMembers);
    setLocalPresets(listLocalExportPresets(ws));
    api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws })
      .then(setServerPresets)
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    if (!ws || projectIds.length === 0) {
      setTasks([]);
      setTaskId("");
      return;
    }
    const filters: Record<string, string | string[]> = { projectId: projectIds };
    if (categoryId) filters.categoryId = categoryId;
    fetchListItems<TaskDto>(ROUTES.TASKS.LIST, { workspaceId: ws, filters })
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [ws, projectIds, categoryId]);

  const [projectMembers, setProjectMembers] = useState<{ userId: string; userName: string }[]>([]);

  useEffect(() => {
    if (!ws || projectIds.length === 0) {
      setProjectMembers([]);
      return;
    }
    Promise.all(
      projectIds.map((id) =>
        fetchProjectTeam(id, { workspaceId: ws })
          .then((res) => res.members)
          .catch(() => [])
      )
    ).then((teamsMembersLists) => {
      const uniqueMembersMap = new Map<string, { userId: string; userName: string }>();
      for (const list of teamsMembersLists) {
        for (const m of list) {
          uniqueMembersMap.set(m.userId, { userId: m.userId, userName: m.userName });
        }
      }
      setProjectMembers([...uniqueMembersMap.values()]);
    });
  }, [ws, projectIds]);

  const scopedMembers = useMemo(() => {
    if (projectIds.length === 0) {
      return members;
    }
    const teamUserIds = new Set(projectMembers.map((m) => m.userId));
    return members.filter((m) => teamUserIds.has(m.userId));
  }, [members, projectMembers, projectIds]);

  const scopedCategories = useMemo(() => {
    if (projectIds.length === 0) return categories;
    const activeCategoryIds = new Set(tasks.map((t) => t.categoryId));
    return categories.filter((c) => activeCategoryIds.has(c.id));
  }, [categories, tasks, projectIds]);

  useEffect(() => {
    if (!taskId) return;
    if (!tasks.some((t) => t.id === taskId)) {
      setTaskId("");
    }
  }, [tasks, taskId]);

  function clearScopeFilters() {
    setProjectIds([]);
    setUserIds([]);
    setCategoryId("");
    setTaskId("");
    setTeamOnly(false);
  }

  useEffect(() => {
    if (exportMode === "invoice") {
      setPreviewBody(null);
    }
  }, [exportMode]);

  const sharedScopeProps = useMemo(
    () => ({
      workspaceId: ws,
      workspaceSlug,
      from,
      to,
      onFromChange: setFrom,
      onToChange: setTo,
      projectIds,
      userIds,
      categoryId,
      taskId,
      teamOnly,
      onProjectIdsChange: setProjectIds,
      onUserIdsChange: setUserIds,
      onCategoryChange: setCategoryId,
      onTaskChange: setTaskId,
      onTeamOnlyChange: setTeamOnly,
      onClearScope: clearScopeFilters,
      projects,
      categories: scopedCategories,
      tasks,
      members: scopedMembers,
      preview,
      previewLoading,
      previewError
    }),
    [
      ws,
      workspaceSlug,
      from,
      to,
      projectIds,
      userIds,
      categoryId,
      taskId,
      teamOnly,
      projects,
      scopedCategories,
      tasks,
      scopedMembers,
      preview,
      previewLoading,
      previewError
    ]
  );

  return (
    <div className="min-w-0 space-y-8">
      <AppBar
        title="Exports"
        description={
          <>
            Download timesheets and summaries for your team. Pick a purpose, set the period, and
            check the live preview before you download. Syncs with the{" "}
            <Link
              href="/dashboard"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              dashboard
            </Link>
            .
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={exportMode}
          onChange={setExportMode}
          options={[
            { value: "quick", label: "Quick reports" },
            { value: "custom", label: "Custom export" }
          ]}
        />
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-primary hover:underline"
          onClick={() => setExportMode("invoice")}
        >
          Need a formal invoice PDF?
        </button>
      </div>

      {exportMode === "quick" ? (
        <ExportQuickFlow
          {...sharedScopeProps}
          onPreviewBodyChange={setPreviewBody}
          initialScenarioId={initialScenarioId}
          onJobCreated={() => setJobRefreshKey((k) => k + 1)}
        />
      ) : exportMode === "custom" ? (
        <ExportCustomFlow
          {...sharedScopeProps}
          localPresets={localPresets}
          serverPresets={serverPresets}
          onLocalPresetsChange={setLocalPresets}
          onServerPresetsChange={setServerPresets}
          onPreviewBodyChange={setPreviewBody}
          onJobCreated={() => setJobRefreshKey((k) => k + 1)}
        />
      ) : exportMode === "invoice" ? (
        <InvoiceWizard />
      ) : null}

      {exportMode !== "invoice" ? (
        <ExportHistoryPanel workspaceId={ws} refreshKey={jobRefreshKey} />
      ) : null}

      <ExportPreviewLoader
        workspaceId={ws}
        previewBody={previewBody}
        onPreview={setPreview}
        onLoading={setPreviewLoading}
        onError={setPreviewError}
      />
    </div>
  );
}

function ExportPreviewLoader({
  workspaceId,
  previewBody,
  onPreview,
  onLoading,
  onError
}: {
  workspaceId: string;
  previewBody: ExportPreviewBodyDto | null;
  onPreview: (data: ExportPreviewResponseDto | null) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}) {
  useEffect(() => {
    if (!workspaceId || !previewBody) {
      onPreview(null);
      return;
    }
    const t = setTimeout(() => {
      onLoading(true);
      onError(null);
      api<ExportPreviewResponseDto>(ROUTES.EXPORT.PREVIEW, {
        method: "POST",
        workspaceId,
        body: JSON.stringify(previewBody)
      })
        .then((data) => {
          onPreview(normalizeExportPreview(data));
          onError(null);
        })
        .catch((e) => {
          onPreview(null);
          onError(e instanceof Error ? e.message : "Could not reach the export preview API.");
        })
        .finally(() => onLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [workspaceId, previewBody, onPreview, onLoading, onError]);

  return null;
}
