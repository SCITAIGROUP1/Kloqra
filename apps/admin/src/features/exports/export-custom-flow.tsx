"use client";

import {
  DEFAULT_EXPORT_COLUMNS,
  ROUTES,
  deriveExportPurpose,
  type ExportBodyDto,
  type ExportGroupByDimension,
  type ExportPresetDto,
  type ExportPreviewResponseDto,
  type ExportReportType,
  type CategoryDto,
  type ProjectDto,
  type TaskDto,
  type WorkspaceMemberDto,
  type ExportPreviewBodyDto
} from "@kloqra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "@kloqra/ui";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ExportDownloadPanel } from "./export-download-panel";
import { ExportOrganizePicker } from "./export-organize-picker";
import { ExportPeriodFilter } from "./export-period-filter";
import { ExportScopeFilters } from "./export-scope-filters";
import { Section, ToggleChip } from "@/components/admin-page";
import { ExportColumnPicker } from "@/components/export-column-picker";
import { ExportSchedulesPanel } from "@/components/export-schedules-panel";
import { api } from "@/lib/api";
import { isClientCommercialFeaturesEnabled } from "@/lib/client-commercial-features";
import {
  loadExportColumnPreferences,
  mergeColumnPreferences,
  saveExportColumnPreferences
} from "@/lib/export-column-preferences";
import { toDateInputValue, formatExportPeriodLabel } from "@/lib/export-date-presets";
import { groupBySummaryLabel, reportsForGroupBy } from "@/lib/export-group-by";
import { normalizeExportBody } from "@/lib/export-normalize";
import {
  deleteLocalExportPreset,
  saveLocalExportPreset,
  type StoredExportPreset
} from "@/lib/export-presets";
import { groupByForSheetLayout, sheetLayoutRequiresTimeEntries } from "@/lib/export-sheet-layout";

const COMMERCIAL_REPORT_IDS = new Set<ExportReportType>(["invoice", "budget_vs_actual"]);

const REPORT_GROUPS: { title: string; reports: { id: ExportReportType; label: string }[] }[] = [
  {
    title: "Payroll & attendance",
    reports: [
      { id: "time_entries", label: "Time entries" },
      { id: "member_daily_total", label: "Daily hours per person" },
      { id: "weekly_summary", label: "Weekly summary" },
      { id: "daily_summary", label: "Daily summary" },
      { id: "missing_days", label: "Days with no time" },
      { id: "users_without_time", label: "Users without time" }
    ]
  },
  {
    title: "Team & capacity",
    reports: [
      { id: "by_member", label: "By member" },
      { id: "member_project_breakdown", label: "Hours by person & project" },
      { id: "utilization", label: "Utilization" },
      { id: "overtime_summary", label: "Over / under hours" },
      { id: "hours_by_source", label: "Timer vs manual" }
    ]
  },
  {
    title: "Clients & billing",
    reports: [
      { id: "by_client", label: "By client" },
      { id: "by_project", label: "By project" },
      { id: "invoice", label: "Invoice" },
      { id: "budget_vs_actual", label: "Budget vs actual" }
    ]
  },
  {
    title: "Detail breakdowns",
    reports: [
      { id: "by_task", label: "By task" },
      { id: "by_category", label: "By category" }
    ]
  },
  {
    title: "Approvals",
    reports: [{ id: "timesheet_approval_status", label: "Timesheet approval status" }]
  }
];

export type ExportCustomFlowProps = {
  workspaceId: string;
  workspaceSlug: string;
  from: string;
  to: string;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  projectIds: string[];
  userIds: string[];
  categoryId: string;
  taskId: string;
  teamOnly: boolean;
  onProjectIdsChange: (ids: string[]) => void;
  onUserIdsChange: (ids: string[]) => void;
  onCategoryChange: (id: string) => void;
  onTaskChange: (id: string) => void;
  onTeamOnlyChange: (teamOnly: boolean) => void;
  onClearScope: () => void;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  members: WorkspaceMemberDto[];
  preview: ExportPreviewResponseDto | null;
  previewLoading: boolean;
  previewError: string | null;
  onPreviewBodyChange: (body: ExportPreviewBodyDto) => void;
  localPresets: StoredExportPreset[];
  serverPresets: ExportPresetDto[];
  onLocalPresetsChange: (presets: StoredExportPreset[]) => void;
  onServerPresetsChange: (presets: ExportPresetDto[]) => void;
  onJobCreated?: () => void;
  /** User's IANA timezone preference — sent to the server so exported dates match the UI. */
  timezone?: string;
};

export function ExportCustomFlow({
  workspaceId,
  workspaceSlug,
  from,
  to,
  onFromChange,
  onToChange,
  projectIds,
  userIds,
  categoryId,
  taskId,
  teamOnly,
  onProjectIdsChange,
  onUserIdsChange,
  onCategoryChange,
  onTaskChange,
  onTeamOnlyChange,
  onClearScope,
  projects,
  categories,
  tasks,
  members,
  preview,
  previewLoading,
  previewError,
  onPreviewBodyChange,
  localPresets,
  serverPresets,
  onLocalPresetsChange,
  onServerPresetsChange,
  onJobCreated,
  timezone
}: ExportCustomFlowProps) {
  const commercialEnabled = isClientCommercialFeaturesEnabled();
  const visibleReportGroups = useMemo(() => {
    if (commercialEnabled) return REPORT_GROUPS;
    return REPORT_GROUPS.map((group) => ({
      ...group,
      reports: group.reports.filter((r) => !COMMERCIAL_REPORT_IDS.has(r.id))
    })).filter((group) => group.reports.length > 0);
  }, [commercialEnabled]);

  const [billable, setBillable] = useState<ExportBodyDto["billable"]>("all");
  const [format, setFormat] = useState<ExportBodyDto["format"]>("xlsx");
  const [sheetLayout, setSheetLayout] = useState<ExportBodyDto["sheetLayout"]>("standard");
  const [groupBy, setGroupBy] = useState<ExportGroupByDimension[]>([]);
  const [reportTypes, setReportTypes] = useState<ExportReportType[]>(["time_entries"]);
  const [columnsByReport, setColumnsByReport] = useState(() =>
    mergeColumnPreferences(loadExportColumnPreferences(workspaceId))
  );
  const [expandedReport, setExpandedReport] = useState<ExportReportType | null>("time_entries");
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    saveExportColumnPreferences(workspaceId, columnsByReport);
  }, [workspaceId, columnsByReport]);

  useEffect(() => {
    if (commercialEnabled) return;
    setReportTypes((prev) => prev.filter((rt) => !COMMERCIAL_REPORT_IDS.has(rt)));
  }, [commercialEnabled]);

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
    const body: ExportBodyDto = {
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
      billable,
      reportTypes: safeReportTypes,
      format,
      groupBy: safeGroupBy,
      sheetLayout,
      columns: columnsPayload,
      ...(timezone ? { timezone } : {}),
      ...(projectIds.length ? { projectIds } : {}),
      ...(userIds.length ? { userIds } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(taskId ? { taskId } : {}),
      ...(teamOnly && projectIds.length > 0 ? { teamOnly: true } : {})
    };
    return { ...body, exportPurpose: deriveExportPurpose(body) };
  }, [
    from,
    to,
    billable,
    safeReportTypes,
    format,
    safeGroupBy,
    sheetLayout,
    projectIds,
    userIds,
    categoryId,
    taskId,
    teamOnly,
    columnsPayload,
    timezone
  ]);

  const previewBody = useMemo(
    () => ({
      from: exportBody.from,
      to: exportBody.to,
      billable: exportBody.billable,
      reportTypes: exportBody.reportTypes,
      groupBy: exportBody.groupBy,
      sheetLayout: exportBody.sheetLayout,
      columns: columnsPayload,
      exportPurpose: exportBody.exportPurpose,
      ...(exportBody.timezone ? { timezone: exportBody.timezone } : {}),
      ...(safeReportTypes.length === 1 && expandedReport
        ? { sampleReportType: expandedReport }
        : {}),
      ...(exportBody.projectIds?.length ? { projectIds: exportBody.projectIds } : {}),
      ...(exportBody.userIds?.length ? { userIds: exportBody.userIds } : {}),
      ...(exportBody.categoryId ? { categoryId: exportBody.categoryId } : {}),
      ...(exportBody.taskId ? { taskId: exportBody.taskId } : {}),
      ...(exportBody.teamOnly ? { teamOnly: true } : {})
    }),
    [exportBody, columnsPayload, expandedReport]
  );

  useEffect(() => {
    onPreviewBodyChange(previewBody);
  }, [previewBody, onPreviewBodyChange]);

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

  function handleResetFilters() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    onFromChange(toDateInputValue(d));
    onToChange(toDateInputValue(new Date()));
    onClearScope();
    setBillable("all");
    toast.success("Filters reset to defaults");
  }

  function onGroupByDimensionsChange(next: ExportGroupByDimension[]) {
    setGroupBy(next);
    if (!next.length) return;
    applySuggestedReports(reportsForGroupBy(next));
  }

  function onSheetLayoutChange(layout: ExportBodyDto["sheetLayout"]) {
    const currentGroupBy = Array.isArray(groupBy) ? groupBy : [];
    setSheetLayout(layout);
    const nextGroupBy = groupByForSheetLayout(layout, currentGroupBy);
    setGroupBy(nextGroupBy);
    onGroupByDimensionsChange(nextGroupBy);

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
    onFromChange(body.from.slice(0, 10));
    onToChange(body.to.slice(0, 10));
    setBillable(body.billable);
    setFormat(body.format);
    setSheetLayout(body.sheetLayout);
    setGroupBy(groupByForSheetLayout(body.sheetLayout, body.groupBy));
    setReportTypes(body.reportTypes);
    onProjectIdsChange(body.projectIds ?? (body.projectId ? [body.projectId] : []));
    onUserIdsChange(body.userIds ?? (body.userId ? [body.userId] : []));
    onCategoryChange(body.categoryId ?? "");
    onTaskChange(body.taskId ?? "");
    onTeamOnlyChange(body.teamOnly ?? false);
    if (body.columns) {
      setColumnsByReport((prev) => {
        const next = { ...prev };
        for (const rt of body.reportTypes) {
          const cols = body.columns?.[rt as ExportReportType];
          if (cols) next[rt as ExportReportType] = [...cols];
        }
        return next;
      });
    }
    setExpandedReport(body.reportTypes[0] ?? null);
  }

  const saveLocalPreset = () => {
    if (!workspaceId || !presetName.trim()) return;
    onLocalPresetsChange(saveLocalExportPreset(workspaceId, presetName.trim(), exportBody));
    setPresetName("");
  };

  const saveServerPreset = async () => {
    if (!workspaceId || !presetName.trim()) return;
    try {
      await api(ROUTES.EXPORT.PRESETS, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({ name: presetName.trim(), body: exportBody })
      });
      const list = await api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId });
      onServerPresetsChange(list);
      setPresetName("");
      toast.success("Export preset saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save preset");
    }
  };

  const layoutNeedsTimeEntries =
    sheetLayoutRequiresTimeEntries(sheetLayout) && !safeReportTypes.includes("time_entries");

  const canExport =
    safeReportTypes.every((rt) => columnsByReport[rt]?.length > 0) && !layoutNeedsTimeEntries;

  const allPresets: Array<
    | { id: string; name: string; body: ExportBodyDto; source: "local" }
    | { id: string; name: string; body: ExportBodyDto; source: "workspace" }
  > = [
    ...serverPresets.map((p) => ({
      id: p.id,
      name: p.name,
      body: p.body,
      source: "workspace" as const
    })),
    ...localPresets.map((p) => ({
      id: p.id,
      name: p.name,
      body: p.body,
      source: "local" as const
    }))
  ];

  const projectNames = projectIds
    .map((id) => projects.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  const userNames = userIds
    .map((id) => members.find((m) => m.userId === id)?.userName)
    .filter((n): n is string => Boolean(n));
  const categoryName = categoryId ? categories.find((c) => c.id === categoryId)?.name : undefined;
  const taskName = taskId ? tasks.find((t) => t.id === taskId)?.taskName : undefined;
  const scopeMembers = members.map((m) => ({ userId: m.userId, userName: m.userName }));

  return (
    <>
      <div className="grid min-w-0 gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="order-2 min-w-0 space-y-5 xl:order-1 xl:col-span-8 xl:space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Period & filters</CardTitle>
              <CardDescription>
                Quick ranges or custom dates. Scope narrows all selected reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ExportPeriodFilter
                from={from}
                to={to}
                onFromChange={onFromChange}
                onToChange={onToChange}
                billable={billable}
                onBillableChange={setBillable}
                previewLoading={previewLoading}
                dateRangeAriaLabel="Custom export date range"
              />

              <ExportScopeFilters
                projectIds={projectIds}
                userIds={userIds}
                onProjectIdsChange={(ids) => {
                  onProjectIdsChange(ids);
                  if (ids.length !== 1) onTaskChange("");
                }}
                onUserIdsChange={onUserIdsChange}
                projects={projects}
                members={scopeMembers}
                categories={categories}
                tasks={tasks}
                categoryId={categoryId}
                taskId={taskId}
                onCategoryChange={(id) => {
                  onCategoryChange(id);
                  onTaskChange("");
                }}
                onTaskChange={onTaskChange}
                teamOnly={teamOnly}
                onTeamOnlyChange={onTeamOnlyChange}
                onClearAll={onClearScope}
                onResetFilters={handleResetFilters}
                previewLoading={previewLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Organize the file</CardTitle>
              <CardDescription>
                Choose how sections are arranged — no spreadsheet jargon required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportOrganizePicker
                mode="custom"
                sheetLayout={sheetLayout}
                groupBy={safeGroupBy}
                onSheetLayoutChange={onSheetLayoutChange}
                onGroupByChange={onGroupByDimensionsChange}
              />
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
              {visibleReportGroups.map((group) => (
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
              <CardTitle className="text-base">Choose what to include</CardTitle>
              <CardDescription>
                Pick and reorder columns per report. At least one column required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {safeReportTypes.map((rt) => {
                const label =
                  visibleReportGroups.flatMap((g) => g.reports).find((o) => o.id === rt)?.label ??
                  rt;
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

        <div className="order-1 min-w-0 xl:order-2 xl:col-span-4">
          <div className="space-y-4 xl:sticky xl:top-6">
            <ExportDownloadPanel
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              periodLabel={formatExportPeriodLabel(from, to)}
              exportBody={exportBody}
              previewBody={previewBody}
              preview={preview}
              previewLoading={previewLoading}
              previewError={previewError}
              format={format}
              onFormatChange={setFormat}
              purposeSlug={exportBody.exportPurpose ?? "custom-export"}
              projectIds={projectIds}
              userIds={userIds}
              projects={projects}
              members={scopeMembers}
              categoryName={categoryName}
              taskName={taskName}
              teamOnly={teamOnly}
              projectNames={projectNames}
              userNames={userNames}
              downloadLabel={`Download ${format.toUpperCase()}`}
              canExport={canExport}
              layoutWarning={
                layoutNeedsTimeEntries
                  ? "This file structure needs a detailed time sheet. Add Time entries under Reports or change the file structure."
                  : null
              }
              onJobCreated={onJobCreated}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saved presets</CardTitle>
                <CardDescription>
                  Save on this computer keeps settings on this device only. Save for whole team
                  shares with every admin in the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!presetName.trim()}
                    onClick={saveLocalPreset}
                  >
                    Save on this computer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!presetName.trim()}
                    onClick={saveServerPreset}
                  >
                    Save for whole team
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
                                onLocalPresetsChange(deleteLocalExportPreset(workspaceId, p.id));
                              } else {
                                await api(ROUTES.EXPORT.PRESET(p.id), {
                                  method: "DELETE",
                                  workspaceId
                                });
                                const list = await api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, {
                                  workspaceId
                                });
                                onServerPresetsChange(list);
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

      <ExportSchedulesPanel
        workspaceId={workspaceId}
        currentBody={exportBody}
        memberEmails={members.map((m) => m.userEmail).filter(Boolean)}
      />
    </>
  );
}
