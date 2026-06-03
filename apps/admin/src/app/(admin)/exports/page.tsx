"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  ProjectColorDot,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@chronomint/ui";
import {
  DEFAULT_EXPORT_COLUMNS,
  ROUTES,
  type ExportBodyDto,
  type ExportPresetDto,
  type ExportPreviewResponseDto,
  type ExportReportType,
  type ProjectDto,
  type ReportShareDto,
  type WorkspaceMemberDto
} from "@chronomint/contracts";
import {
  PageHeader,
  PreviewBanner,
  Section,
  SegmentedControl,
  ToggleChip
} from "@/components/admin-page";
import { ExportColumnPicker } from "@/components/export-column-picker";
import { ExportSchedulesPanel } from "@/components/export-schedules-panel";
import { api, apiDownloadPost } from "@/lib/api";
import { applyDatePreset, toDateInputValue, type DatePreset } from "@/lib/export-date-presets";
import {
  deleteLocalExportPreset,
  listLocalExportPresets,
  saveLocalExportPreset,
  type StoredExportPreset
} from "@/lib/export-presets";
import { saveDownloadResponse } from "@/lib/download";
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
      { id: "by_task", label: "By task" }
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

export default function ExportsPage() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [teamOnly, setTeamOnly] = useState(false);
  const [billable, setBillable] = useState<ExportBodyDto["billable"]>("all");
  const [format, setFormat] = useState<ExportBodyDto["format"]>("xlsx");
  const [reportTypes, setReportTypes] = useState<ExportReportType[]>([
    "time_entries",
    "by_project"
  ]);
  const [columnsByReport, setColumnsByReport] = useState(defaultColumnsMap);
  const [expandedReport, setExpandedReport] = useState<ExportReportType | null>("time_entries");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
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
    api<WorkspaceMemberDto[]>(ROUTES.WORKSPACES.MEMBERS(ws), { workspaceId: ws }).then(setMembers);
    setLocalPresets(listLocalExportPresets(ws));
    api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, { workspaceId: ws })
      .then(setServerPresets)
      .catch(() => {});
  }, [ws]);

  const columnsPayload = useMemo(() => {
    const out: Partial<Record<ExportReportType, string[]>> = {};
    for (const rt of reportTypes) {
      out[rt] = columnsByReport[rt];
    }
    return out;
  }, [reportTypes, columnsByReport]);

  const exportBody = useMemo((): ExportBodyDto => {
    return {
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
      billable,
      reportTypes,
      format,
      columns: columnsPayload,
      ...(projectId ? { projectId } : {}),
      ...(userId ? { userId } : {}),
      ...(teamOnly && projectId ? { teamOnly: true } : {})
    };
  }, [from, to, billable, reportTypes, format, projectId, userId, teamOnly, columnsPayload]);

  const previewBody = useMemo(
    () => ({
      from: exportBody.from,
      to: exportBody.to,
      billable: exportBody.billable,
      reportTypes: exportBody.reportTypes,
      ...(exportBody.projectId ? { projectId: exportBody.projectId } : {}),
      ...(exportBody.userId ? { userId: exportBody.userId } : {}),
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
          setPreview(data);
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

  function toggleReport(rt: ExportReportType) {
    setReportTypes((prev) => {
      const next = prev.includes(rt)
        ? prev.length > 1
          ? prev.filter((r) => r !== rt)
          : prev
        : [...prev, rt];
      if (!prev.includes(rt)) setExpandedReport(rt);
      return next;
    });
  }

  function applyPresetBody(body: ExportBodyDto) {
    setFrom(body.from.slice(0, 10));
    setTo(body.to.slice(0, 10));
    setBillable(body.billable);
    setFormat(body.format);
    setReportTypes(body.reportTypes);
    setProjectId(body.projectId ?? "");
    setUserId(body.userId ?? "");
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
        e instanceof Error
          ? `Share link failed: ${e.message}`
          : "Could not create share link."
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

  const previewContent = useCallback(() => {
    if (previewLoading) return "Estimating how many rows will be exported…";
    if (previewError) return previewError;
    if (!preview) return "Preview unavailable.";
    if (preview.isEmpty) return "No rows match these filters. Try a wider date range or fewer filters.";
    const parts = reportTypes.map((rt) => {
      const n = preview.counts[rt];
      if (n === undefined) return null;
      const label =
        REPORT_GROUPS.flatMap((g) => g.reports).find((o) => o.id === rt)?.label ?? rt;
      return `${n.toLocaleString()} ${label}`;
    });
    return `${parts.filter(Boolean).join(" · ")} · ${preview.totalLogRows.toLocaleString()} underlying time logs`;
  }, [preview, previewLoading, previewError, reportTypes]);

  const canExport = reportTypes.every((rt) => columnsByReport[rt]?.length > 0);
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
            Build multi-sheet reports for your workspace. Filters and date range sync with the{" "}
            <Link href="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
              dashboard
            </Link>
            .
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Period & filters</CardTitle>
              <CardDescription>Quick ranges or custom dates. Scope narrows all selected reports.</CardDescription>
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={projectId || "__all__"}
                    onValueChange={(v) => setProjectId(v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <ProjectColorDot color={p.color} />
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select
                    value={userId || "__all__"}
                    onValueChange={(v) => setUserId(v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All members</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.userName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {projectId ? (
                <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamOnly}
                    onChange={(e) => setTeamOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Only include project team members
                </label>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Reports</CardTitle>
              <CardDescription>Select one or more. Configure columns for each report below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {REPORT_GROUPS.map((group) => (
                <Section key={group.title} title={group.title}>
                  <div className="flex flex-wrap gap-2">
                    {group.reports.map((opt) => (
                      <ToggleChip
                        key={opt.id}
                        selected={reportTypes.includes(opt.id)}
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
              <CardDescription>Choose and reorder columns per report. At least one column required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reportTypes.map((rt) => {
                const label =
                  REPORT_GROUPS.flatMap((g) => g.reports).find((o) => o.id === rt)?.label ?? rt;
                const open = expandedReport === rt;
                return (
                  <div
                    key={rt}
                    className="rounded-lg border border-border overflow-hidden"
                  >
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
                      <span className="text-muted-foreground text-xs">{open ? "Hide" : "Edit"}</span>
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
                  {previewContent()}
                </PreviewBanner>

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
                    <a href={shareUrl} className="text-primary underline" target="_blank" rel="noreferrer">
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
                <CardDescription>Reload a configuration or save the current setup.</CardDescription>
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
                                ws && setLocalPresets(deleteLocalExportPreset(ws, p.id));
                              } else {
                                await api(ROUTES.EXPORT.PRESET(p.id), {
                                  method: "DELETE",
                                  workspaceId: ws
                                });
                                const list = await api<ExportPresetDto[]>(ROUTES.EXPORT.PRESETS, {
                                  workspaceId: ws
                                });
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
    </div>
  );
}
