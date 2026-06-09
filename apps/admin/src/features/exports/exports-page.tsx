"use client";

import {
  DEFAULT_EXPORT_COLUMNS,
  ROUTES,
  type ExportBodyDto,
  type ExportGroupByDimension,
  type ExportSheetLayout,
  type ExportPresetDto,
  type ExportPreviewResponseDto,
  type ExportReportType,
  type CategoryDto,
  type ProjectDto,
  type TaskDto,
  type ReportShareDto,
  type WorkspaceMemberDto
} from "@chronomint/contracts";
import {
  Badge,
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
import { ReportScopeFilters } from "@chronomint/web-shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InvoiceWizard } from "./invoice-wizard";
import {
  PageHeader,
  PreviewBanner,
  Section,
  SegmentedControl,
  ToggleChip
} from "@/components/admin-page";
import { ExportColumnPicker } from "@/components/export-column-picker";
import { ExportLayoutPreview } from "@/components/export-layout-preview";
import { ExportSchedulesPanel } from "@/components/export-schedules-panel";
import { api } from "@/lib/api";
import { apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { applyDatePreset, toDateInputValue, type DatePreset } from "@/lib/export-date-presets";
import {
  GROUP_BY_DIMENSION_OPTIONS,
  groupByCombinationHint,
  groupBySummaryLabel,
  moveGroupByDimension,
  reportsForGroupBy
} from "@/lib/export-group-by";
import { normalizeExportBody, normalizeExportPreview } from "@/lib/export-normalize";
import {
  deleteLocalExportPreset,
  listLocalExportPresets,
  saveLocalExportPreset,
  type StoredExportPreset
} from "@/lib/export-presets";
import {
  groupByForSheetLayout,
  primaryGroupByForSheetLayout,
  SHEET_LAYOUT_OPTIONS,
  sheetLayoutRequiresTimeEntries
} from "@/lib/export-sheet-layout";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const REPORT_GROUPS: { title: string; reports: { id: ExportReportType; label: string }[] }[] = [
  {
    title: "Time data",
    reports: [
      { id: "time_entries", label: "Time entries" },
      { id: "daily_summary", label: "Daily summary" },
      { id: "weekly_summary", label: "Weekly summary" }
    ]
  },
  {
    title: "Breakdowns",
    reports: [
      { id: "by_project", label: "By project" },
      { id: "by_member", label: "By member" },
      { id: "by_client", label: "By client" },
      { id: "by_task", label: "By task" },
      { id: "by_category", label: "By category" }
    ]
  },
  {
    title: "Finance & planning",
    reports: [
      { id: "invoice", label: "Invoice" },
      { id: "budget_vs_actual", label: "Budget vs actual" },
      { id: "utilization", label: "Utilization" },
      { id: "users_without_time", label: "Users without time" }
    ]
  }
];

const PERIOD_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "month", label: "This month" }
];

function defaultColumnsMap(): Record<ExportReportType, string[]> {
  return Object.fromEntries(
    (Object.keys(DEFAULT_EXPORT_COLUMNS) as ExportReportType[]).map((k) => [
      k,
      [...DEFAULT_EXPORT_COLUMNS[k]]
    ])
  ) as Record<ExportReportType, string[]>;
}

function formatPeriodLabel(from: string, to: string) {
  const f = new Date(from + "T12:00:00");
  const t = new Date(to + "T12:00:00");
  return `${f.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${t.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function ExportsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [exportMode, setExportMode] = useState<"standard" | "invoice">("standard");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);
  const [billable, setBillable] = useState<ExportBodyDto["billable"]>("all");
  const [format, setFormat] = useState<ExportBodyDto["format"]>("xlsx");
  const [sheetLayout, setSheetLayout] = useState<ExportSheetLayout>("standard");
  const [groupBy, setGroupBy] = useState<ExportGroupByDimension[]>([]);
  const [reportTypes, setReportTypes] = useState<ExportReportType[]>(["time_entries"]);
  const [columnsByReport, setColumnsByReport] = useState(defaultColumnsMap);
  const [expandedReport, setExpandedReport] = useState<ExportReportType | null>("time_entries");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<ExportPreviewResponseDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [localPresets, setLocalPresets] = useState<StoredExportPreset[]>([]);
  const [serverPresets, setServerPresets] = useState<ExportPresetDto[]>([]);
  const [presetName, setPresetName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qFrom = params.get("from");
    const qTo = params.get("to");
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
  }, []);

  useEffect(() => {
    if (!ws) return;
    api<ProjectDto[]>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    api<CategoryDto[]>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(setCategories);
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(setMembers);
    setLocalPresets(listLocalExportPresets(ws));
    api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws })
      .then(setServerPresets)
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    if (!ws || !projectId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    const params = new URLSearchParams({ projectId });
    if (categoryId) params.set("categoryId", categoryId);
    api<TaskDto[]>(`${ROUTES.TASKS.LIST}?${params}`, { workspaceId: ws })
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [ws, projectId, categoryId]);

  useEffect(() => {
    if (!taskId) return;
    if (!tasks.some((t) => t.id === taskId)) {
      setTaskId("");
    }
  }, [tasks, taskId]);

  const safeReportTypes = useMemo(
    () => (Array.isArray(reportTypes) ? reportTypes : []),
    [reportTypes]
  );
  const safeGroupBy = useMemo(() => (Array.isArray(groupBy) ? groupBy : []), [groupBy]);

  const columnsPayload = useMemo(() => {
    const out: Partial<Record<ExportReportType, string[]>> = {};
    for (const rt of safeReportTypes) {
      out[rt] = columnsByReport[rt];
    }
    return out;
  }, [safeReportTypes, columnsByReport]);

  const exportBody = useMemo((): ExportBodyDto => {
    return {
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
      billable,
      reportTypes: safeReportTypes,
      format,
      groupBy: safeGroupBy,
      sheetLayout,
      columns: columnsPayload,
      ...(projectId ? { projectId } : {}),
      ...(userId ? { userId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(taskId ? { taskId } : {}),
      ...(teamOnly && projectId ? { teamOnly: true } : {})
    };
  }, [
    from,
    to,
    billable,
    safeReportTypes,
    format,
    safeGroupBy,
    sheetLayout,
    projectId,
    userId,
    categoryId,
    taskId,
    teamOnly,
    columnsPayload
  ]);

  const previewBody = useMemo(
    () => ({
      from: exportBody.from,
      to: exportBody.to,
      billable: exportBody.billable,
      reportTypes: exportBody.reportTypes,
      groupBy: exportBody.groupBy,
      sheetLayout: exportBody.sheetLayout,
      ...(exportBody.projectId ? { projectId: exportBody.projectId } : {}),
      ...(exportBody.userId ? { userId: exportBody.userId } : {}),
      ...(exportBody.categoryId ? { categoryId: exportBody.categoryId } : {}),
      ...(exportBody.taskId ? { taskId: exportBody.taskId } : {}),
      ...(exportBody.teamOnly ? { teamOnly: true } : {})
    }),
    [exportBody]
  );

  useEffect(() => {
    if (!ws) return;
    const t = setTimeout(() => {
      setPreviewLoading(true);
      setPreviewError(null);
      api<ExportPreviewResponseDto>(ROUTES.EXPORT.PREVIEW, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify(previewBody)
      })
        .then((data) => {
          setPreview(normalizeExportPreview(data));
          setPreviewError(null);
        })
        .catch((e) => {
          setPreview(null);
          setPreviewError(
            e instanceof Error ? e.message : "Could not reach the export preview API."
          );
        })
        .finally(() => setPreviewLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [ws, previewBody]);

  function applySuggestedReports(suggested: ExportReportType[]) {
    setReportTypes((prev) => {
      const merged = [...(Array.isArray(prev) ? prev : [])];
      for (const rt of suggested) {
        if (!merged.includes(rt)) merged.push(rt);
      }
      return merged;
    });
    setExpandedReport((cur) => cur ?? suggested[0] ?? null);
    setColumnsByReport((prev) => {
      const nextCols = { ...prev };
      for (const rt of suggested) {
        if (!nextCols[rt]?.length) {
          const defaults = DEFAULT_EXPORT_COLUMNS[rt];
          if (defaults) nextCols[rt] = [...defaults];
        }
      }
      return nextCols;
    });
  }

  function onGroupByDimensionsChange(next: ExportGroupByDimension[]) {
    setGroupBy(next);
    if (!next.length) return;
    applySuggestedReports(reportsForGroupBy(next));
  }

  function toggleGroupByDimension(dim: ExportGroupByDimension) {
    const current = Array.isArray(groupBy) ? groupBy : [];
    const layoutPrimary = primaryGroupByForSheetLayout(sheetLayout);
    if (layoutPrimary && dim === layoutPrimary && current.includes(dim)) {
      return;
    }
    const next = current.includes(dim) ? current.filter((d) => d !== dim) : [...current, dim];
    onGroupByDimensionsChange(next);
  }

  function onSheetLayoutChange(layout: ExportSheetLayout) {
    const currentGroupBy = Array.isArray(groupBy) ? groupBy : [];
    setSheetLayout(layout);
    setGroupBy(groupByForSheetLayout(layout, currentGroupBy));

    if (layout === "standard") return;

    const types = Array.isArray(reportTypes) ? reportTypes : [];
    if (!types.includes("time_entries")) {
      applySuggestedReports(["time_entries", ...types]);
    }
  }

  function toggleReport(rt: ExportReportType) {
    setReportTypes((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const next = current.includes(rt)
        ? current.length > 1
          ? current.filter((r) => r !== rt)
          : current
        : [...current, rt];
      if (!current.includes(rt)) setExpandedReport(rt);
      return next;
    });
  }

  function applyPresetBody(raw: ExportBodyDto) {
    const body = normalizeExportBody(raw);
    setFrom(body.from.slice(0, 10));
    setTo(body.to.slice(0, 10));
    setBillable(body.billable);
    setFormat(body.format);
    setSheetLayout(body.sheetLayout);
    setGroupBy(groupByForSheetLayout(body.sheetLayout, body.groupBy));
    setReportTypes(body.reportTypes);
    setProjectId(body.projectId ?? "");
    setUserId(body.userId ?? "");
    setCategoryId(body.categoryId ?? "");
    setTaskId(body.taskId ?? "");
    setTeamOnly(body.teamOnly ?? false);
    if (body.columns) {
      setColumnsByReport((prev) => {
        const next = { ...prev };
        for (const rt of body.reportTypes) {
          if (body.columns?.[rt]) next[rt] = [...body.columns[rt]!];
        }
        return next;
      });
    }
    setExpandedReport(body.reportTypes[0] ?? null);
  }

  function onExportProjectChange(nextId: string) {
    setProjectId(nextId);
    setTaskId("");
  }

  function onExportCategoryChange(nextId: string) {
    setCategoryId(nextId);
    setTaskId("");
  }

  function clearScopeFilters() {
    setProjectId("");
    setUserId("");
    setCategoryId("");
    setTaskId("");
    setTeamOnly(false);
  }

  const saveLocalPreset = () => {
    if (!ws || !presetName.trim()) return;
    setLocalPresets(saveLocalExportPreset(ws, presetName.trim(), exportBody));
    setPresetName("");
  };

  const saveServerPreset = async () => {
    if (!ws || !presetName.trim()) return;
    try {
      await api(ROUTES.EXPORT.PRESETS, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({ name: presetName.trim(), body: exportBody })
      });
      const list = await api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws });
      setServerPresets(list);
      setPresetName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preset");
    }
  };

  async function createShareLink() {
    if (!ws) return;
    setSharing(true);
    setShareUrl(null);
    try {
      const result = await api<ReportShareDto>(ROUTES.EXPORT.SHARES, {
        method: "POST",
        workspaceId: ws,
        body: JSON.stringify({
          body: previewBody,
          expiresInDays: 30
        })
      });
      setShareUrl(result.shareUrl);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? `Share link failed: ${e.message}` : "Could not create share link."
      );
    } finally {
      setSharing(false);
    }
  }

  async function runExport() {
    setError(null);
    setExporting(true);
    try {
      const res = await apiDownloadPost(ROUTES.EXPORT.GENERATE, ws, exportBody);
      const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
      await saveDownloadResponse(res, `chronomint-export.${ext}`);
    } catch {
      setError("Export failed. Check filters and that the API is running.");
    } finally {
      setExporting(false);
    }
  }

  const layoutNeedsTimeEntries =
    sheetLayoutRequiresTimeEntries(sheetLayout) && !safeReportTypes.includes("time_entries");

  const canExport =
    safeReportTypes.every((rt) => columnsByReport[rt]?.length > 0) && !layoutNeedsTimeEntries;
  const allPresets = [
    ...serverPresets.map((p) => ({ ...p, source: "workspace" as const })),
    ...localPresets.map((p) => ({ id: p.id, name: p.name, body: p.body, source: "local" as const }))
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exports"
        description={
          <>
            Download timesheets and summaries for your team. Pick a period, choose how tabs are
            organized, and check the live preview before you download. Syncs with the{" "}
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

      <div className="flex justify-start">
        <SegmentedControl
          value={exportMode}
          onChange={setExportMode}
          options={[
            { value: "standard", label: "Workbook Export" },
            { value: "invoice", label: "Invoice Wizard" }
          ]}
        />
      </div>

      {exportMode === "standard" ? (
        <>
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Period & filters</CardTitle>
                  <CardDescription>
                    Quick ranges or custom dates. Scope narrows all selected reports.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Section title="Quick range">
                    <div className="flex flex-wrap gap-2">
                      {PERIOD_PRESETS.map(({ id, label }) => (
                        <Button
                          key={id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            const range = applyDatePreset(id);
                            setFrom(range.from);
                            setTo(range.to);
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </Section>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="from">From</Label>
                      <Input
                        id="from"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="to">To</Label>
                      <Input
                        id="to"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Billable</Label>
                      <Select
                        value={billable}
                        onValueChange={(v) => setBillable(v as ExportBodyDto["billable"])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All entries</SelectItem>
                          <SelectItem value="billable">Billable only</SelectItem>
                          <SelectItem value="non_billable">Non-billable only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ReportScopeFilters
                    taskRequiresProject
                    values={{ projectId, categoryId, taskId, userId }}
                    projects={projects}
                    categories={categories}
                    tasks={tasks}
                    members={members.map((m) => ({ userId: m.userId, userName: m.userName }))}
                    onProjectChange={onExportProjectChange}
                    onCategoryChange={onExportCategoryChange}
                    onTaskChange={setTaskId}
                    onUserChange={setUserId}
                    onClearAll={clearScopeFilters}
                    footer={
                      projectId ? (
                        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={teamOnly}
                            onChange={(e) => setTeamOnly(e.target.checked)}
                            className="h-4 w-4 rounded border-border"
                          />
                          Only include project team members
                        </label>
                      ) : undefined
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Workbook layout</CardTitle>
                  <CardDescription>
                    How tabs are organized in Excel (or files in a ZIP for CSV). Best for monthly
                    timesheets: one tab per person.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {SHEET_LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSheetLayoutChange(opt.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        sheetLayout === opt.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {opt.description}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{opt.bestFor}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Row order inside each tab</CardTitle>
                  <CardDescription>
                    {primaryGroupByForSheetLayout(sheetLayout)
                      ? `Matches your workbook layout (${SHEET_LAYOUT_OPTIONS.find((o) => o.id === sheetLayout)?.label}). Add Day or Week to sort days in order inside each tab.`
                      : "Optional. Controls how rows are sorted (e.g. member first, then day). Each option can add a matching totals tab."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {GROUP_BY_DIMENSION_OPTIONS.map((opt) => (
                      <ToggleChip
                        key={opt.id}
                        selected={safeGroupBy.includes(opt.id)}
                        onClick={() => toggleGroupByDimension(opt.id)}
                      >
                        {opt.label}
                      </ToggleChip>
                    ))}
                  </div>
                  {safeGroupBy.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Sort order</p>
                      <ol className="space-y-1.5">
                        {safeGroupBy.map((dim, index) => {
                          const label =
                            GROUP_BY_DIMENSION_OPTIONS.find((o) => o.id === dim)?.label ?? dim;
                          return (
                            <li
                              key={dim}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                            >
                              <span>
                                <span className="text-muted-foreground tabular-nums">
                                  {index + 1}.
                                </span>{" "}
                                {label}
                              </span>
                              <span className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  disabled={index === 0}
                                  onClick={() =>
                                    setGroupBy(
                                      groupByForSheetLayout(
                                        sheetLayout,
                                        moveGroupByDimension(safeGroupBy, index, -1)
                                      )
                                    )
                                  }
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  disabled={index === safeGroupBy.length - 1}
                                  onClick={() =>
                                    setGroupBy(
                                      groupByForSheetLayout(
                                        sheetLayout,
                                        moveGroupByDimension(safeGroupBy, index, 1)
                                      )
                                    )
                                  }
                                >
                                  ↓
                                </Button>
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {groupByCombinationHint(safeGroupBy)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Reports</CardTitle>
                  <CardDescription>
                    {safeGroupBy.length === 0
                      ? "Select one or more. Configure columns for each report below."
                      : `Sheets for ${groupBySummaryLabel(safeGroupBy)} — add or remove types as needed.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {REPORT_GROUPS.map((group) => (
                    <Section key={group.title} title={group.title}>
                      <div className="flex flex-wrap gap-2">
                        {group.reports.map((opt) => (
                          <ToggleChip
                            key={opt.id}
                            selected={safeReportTypes.includes(opt.id)}
                            onClick={() => toggleReport(opt.id)}
                          >
                            {opt.label}
                          </ToggleChip>
                        ))}
                      </div>
                    </Section>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Columns</CardTitle>
                  <CardDescription>
                    Choose and reorder columns per report. At least one column required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {safeReportTypes.map((rt) => {
                    const label =
                      REPORT_GROUPS.flatMap((g) => g.reports).find((o) => o.id === rt)?.label ?? rt;
                    const open = expandedReport === rt;
                    return (
                      <div key={rt} className="rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50"
                          onClick={() => setExpandedReport(open ? null : rt)}
                        >
                          <span>
                            {label}
                            <Badge variant="secondary" className="ml-2 font-normal">
                              {columnsByReport[rt]?.length ?? 0} cols
                            </Badge>
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {open ? "Hide" : "Edit"}
                          </span>
                        </button>
                        {open ? (
                          <div className="border-t border-border p-3">
                            <ExportColumnPicker
                              report={rt}
                              selected={columnsByReport[rt] ?? []}
                              onChange={(cols) =>
                                setColumnsByReport((prev) => ({ ...prev, [rt]: cols }))
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-6 space-y-4">
                <Card className="shadow-md border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Export summary</CardTitle>
                    <CardDescription>{formatPeriodLabel(from, to)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PreviewBanner
                      loading={previewLoading}
                      error={!!previewError && !previewLoading}
                      empty={!!preview?.isEmpty && !previewLoading && !previewError}
                    >
                      <ExportLayoutPreview
                        preview={preview}
                        loading={previewLoading}
                        error={previewError}
                        format={format}
                      />
                    </PreviewBanner>

                    {layoutNeedsTimeEntries ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Turn on <strong>Time entries</strong> in Reports for this workbook layout.
                      </p>
                    ) : null}

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">File format</Label>
                      <SegmentedControl
                        value={format}
                        onChange={setFormat}
                        size="md"
                        fullWidth
                        options={[
                          { value: "csv", label: "CSV" },
                          { value: "xlsx", label: "Excel" },
                          { value: "pdf", label: "PDF" }
                        ]}
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={runExport}
                        disabled={!canExport || exporting}
                      >
                        {exporting ? "Preparing download…" : `Download ${format.toUpperCase()}`}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={createShareLink}
                        disabled={sharing}
                      >
                        {sharing ? "Creating link…" : "Create read-only share link"}
                      </Button>
                    </div>

                    {shareUrl ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs break-all">
                        <p className="font-medium text-foreground mb-1">Share link (30 days)</p>
                        <a
                          href={shareUrl}
                          className="text-primary underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shareUrl}
                        </a>
                      </div>
                    ) : null}

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Saved presets</CardTitle>
                    <CardDescription>
                      Reload a configuration or save the current setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Preset name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!presetName.trim()}
                        onClick={saveLocalPreset}
                      >
                        Save locally
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!presetName.trim()}
                        onClick={saveServerPreset}
                      >
                        Save to workspace
                      </Button>
                    </div>
                    {allPresets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No presets yet.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                        {allPresets.map((p) => (
                          <li
                            key={`${p.source}-${p.id}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
                          >
                            <button
                              type="button"
                              className="text-left text-sm font-medium truncate hover:underline"
                              onClick={() => applyPresetBody(p.body)}
                            >
                              {p.name}
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="outline" className="text-[10px] px-1.5">
                                {p.source === "local" ? "Local" : "Team"}
                              </Badge>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive text-xs px-1"
                                aria-label={`Delete ${p.name}`}
                                onClick={async () => {
                                  if (p.source === "local") {
                                    if (ws) setLocalPresets(deleteLocalExportPreset(ws, p.id));
                                  } else {
                                    await api(ROUTES.EXPORT.PRESET(p.id), {
                                      method: "DELETE",
                                      workspaceId: ws
                                    });
                                    const list = await api<ExportPresetDto[]>(
                                      ROUTES.EXPORT.PRESETS,
                                      {
                                        workspaceId: ws
                                      }
                                    );
                                    setServerPresets(list);
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <ExportSchedulesPanel workspaceId={ws} currentBody={exportBody} />
        </>
      ) : (
        <InvoiceWizard />
      )}
    </div>
  );
}
