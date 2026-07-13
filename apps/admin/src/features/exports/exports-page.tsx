"use client";

import {
  ROUTES,
  type ExportPresetDto,
  type ExportPreviewBodyDto,
  type ExportPreviewResponseDto,
  type WorkspaceMemberDto
} from "@kloqra/contracts";
import {
  fetchProjectTeam,
  useEntryCatalogQueries,
  useTasksListQuery,
  useWorkspaceOperationalSettings
} from "@kloqra/web-shared";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExportCustomFlow } from "./export-custom-flow";
import { ExportHistoryPanel } from "./export-history-panel";
import { ExportQuickFlow } from "./export-quick-flow";
import type { ExportScenarioId } from "./export-scenarios";
import { InvoiceWizard } from "./invoice-wizard";
import { AppBar, SegmentedControl } from "@/components/admin-page";
import { api } from "@/lib/api";
import { isClientCommercialFeaturesEnabled } from "@/lib/client-commercial-features";
import { describeExportPeriodApplied, toDateInputValue } from "@/lib/export-date-presets";
import { normalizeExportPreview } from "@/lib/export-normalize";
import { listLocalExportPresets, type StoredExportPreset } from "@/lib/export-presets";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

type ExportMode = "quick" | "custom" | "invoice";

export function ExportsPage() {
  const commercialEnabled = isClientCommercialFeaturesEnabled();
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

  const catalog = useEntryCatalogQueries(ws, { enabled: Boolean(ws) });
  const projects = catalog.projects;
  const categories = catalog.categories;
  const { timezone: workspaceTimezone } = useWorkspaceOperationalSettings(ws, Boolean(ws));

  const taskFilters = useMemo(() => {
    if (projectIds.length === 0) return undefined;
    const filters: Record<string, string | string[]> = { projectId: projectIds };
    if (categoryId) filters.categoryId = categoryId;
    return filters;
  }, [projectIds, categoryId]);

  const { data: tasks = [], refetch: refetchTasks } = useTasksListQuery(
    ws,
    taskFilters,
    Boolean(ws && projectIds.length > 0)
  );
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);

  const [preview, setPreview] = useState<ExportPreviewResponseDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBody, setPreviewBody] = useState<ExportPreviewBodyDto | null>(null);
  const [jobRefreshKey, setJobRefreshKey] = useState(0);
  const [initialScenarioId, setInitialScenarioId] = useState<ExportScenarioId | null>(null);

  const [localPresets, setLocalPresets] = useState<StoredExportPreset[]>([]);
  const [serverPresets, setServerPresets] = useState<ExportPresetDto[]>([]);

  const initialTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!commercialEnabled && exportMode === "invoice") {
      setExportMode("quick");
    }
  }, [commercialEnabled, exportMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qFrom = params.get("from");
    const qTo = params.get("to");
    const qScenario = params.get("scenario");
    const qMode = params.get("mode");
    const qProjectIds = params.get("projectId") || params.get("projectIds");
    const qUserIds = params.get("userId") || params.get("userIds");
    const qCategoryId = params.get("categoryId");
    const qTaskId = params.get("taskId");

    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qScenario) setInitialScenarioId(qScenario as ExportScenarioId);
    if (qMode === "custom" || qProjectIds || qUserIds || qCategoryId || qTaskId) {
      setExportMode("custom");
    }
    if (qProjectIds) {
      setProjectIds(
        qProjectIds
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }
    if (qUserIds) {
      setUserIds(
        qUserIds
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }
    if (qCategoryId) {
      setCategoryId(qCategoryId);
    }
    if (qTaskId) {
      setTaskId(qTaskId);
      initialTaskIdRef.current = qTaskId;
    }
  }, []);

  useEffect(() => {
    if (!ws) return;
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(setMembers);
    setLocalPresets(listLocalExportPresets(ws));
    api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws })
      .then(setServerPresets)
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    if (!ws || projectIds.length === 0) {
      setTaskId("");
      return;
    }
    void refetchTasks().then((result) => {
      const fetchedTasks = result.data ?? [];
      if (initialTaskIdRef.current) {
        if (!fetchedTasks.some((t) => t.id === initialTaskIdRef.current)) {
          setTaskId("");
        }
        initialTaskIdRef.current = null;
      }
    });
  }, [ws, projectIds, categoryId, refetchTasks]);

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
    if (initialTaskIdRef.current === taskId) return;
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
      previewError,
      // Workspace TZ so exports match operational admin views
      timezone: workspaceTimezone
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
      previewError,
      workspaceTimezone
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="w-full min-w-0 sm:w-auto">
          <SegmentedControl
            value={exportMode}
            onChange={setExportMode}
            fullWidth
            options={[
              { value: "quick", label: "Quick reports" },
              { value: "custom", label: "Custom export" }
            ]}
          />
        </div>
        {commercialEnabled ? (
          <button
            type="button"
            className="shrink-0 text-left text-sm text-muted-foreground hover:text-primary hover:underline sm:text-right"
            onClick={() => setExportMode("invoice")}
          >
            Need a formal invoice PDF?
          </button>
        ) : null}
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
      ) : commercialEnabled && exportMode === "invoice" ? (
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
  const skipPreviewToast = useRef(true);
  const lastToastKey = useRef<string | null>(null);

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
          const normalized = normalizeExportPreview(data);
          onPreview(normalized);
          onError(null);

          if (!normalized) return;

          if (skipPreviewToast.current) {
            skipPreviewToast.current = false;
            return;
          }

          const from = previewBody.from.slice(0, 10);
          const to = previewBody.to.slice(0, 10);
          const toastKey = `${from}|${to}|${normalized.totalLogRows ?? 0}|${previewBody.reportTypes.join(",")}`;
          if (lastToastKey.current === toastKey) return;
          lastToastKey.current = toastKey;

          const rows = normalized.totalLogRows ?? 0;
          toast.success("Preview updated", {
            description: `${describeExportPeriodApplied(from, to)} · ${rows.toLocaleString()} ${rows === 1 ? "entry" : "entries"}`,
            duration: 2600
          });
        })
        .catch((e) => {
          onPreview(null);
          onError(e instanceof Error ? e.message : "Could not reach the export preview API.");
          toast.error("Preview could not update", {
            description: "Check your filters and try again."
          });
        })
        .finally(() => onLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [workspaceId, previewBody, onPreview, onLoading, onError]);

  return null;
}
