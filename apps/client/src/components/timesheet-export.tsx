"use client";

import {
  ROUTES,
  buildExportFilename,
  DEFAULT_MEMBER_EXPORT_COLUMNS,
  type CategoryDto,
  type MemberExportBodyDto,
  type MemberExportReportType,
  type ProjectDto
} from "@kloqra/contracts";
import {
  Button,
  Card,
  CardContent,
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
} from "@kloqra/ui";
import { fetchListItems, toDateInputValue } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import { apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

type TimesheetExportProps = {
  workspaceSlug?: string;
  defaultFrom?: string;
  defaultTo?: string;
};

export function TimesheetExport({
  workspaceSlug = "workspace",
  defaultFrom,
  defaultTo
}: TimesheetExportProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [from, setFrom] = useState(() => {
    if (defaultFrom) return defaultFrom;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => defaultTo ?? toDateInputValue(new Date()));
  const [projectId, setProjectId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reportType, setReportType] = useState<MemberExportReportType>("time_entries");
  const [format, setFormat] = useState<MemberExportBodyDto["format"]>("csv");
  const [billable, setBillable] = useState<MemberExportBodyDto["billable"]>("all");
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!ws) return;
    void fetchListItems<ProjectDto>(ROUTES.PROJECTS.LIST, { workspaceId: ws }).then(setProjects);
    void fetchListItems<CategoryDto>(ROUTES.CATEGORIES.LIST, { workspaceId: ws }).then(
      setCategories
    );
  }, [ws]);

  async function runExport() {
    setError(null);
    setExporting(true);
    try {
      const body: MemberExportBodyDto = {
        from: new Date(from).toISOString(),
        to: new Date(to + "T23:59:59").toISOString(),
        billable,
        reportTypes: [reportType],
        format,
        ...(projectId ? { projectId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(reportType === "time_entries"
          ? { columns: { time_entries: [...DEFAULT_MEMBER_EXPORT_COLUMNS.time_entries] } }
          : {})
      };
      const res = await apiDownloadPost(ROUTES.EXPORT.ME, ws, body);
      const fallback = buildExportFilename({
        workspaceSlug,
        from: body.from,
        to: body.to,
        scope: "member",
        reportSlug: reportType === "by_category" ? "by-category" : "time-entries",
        ext: format === "xlsx" ? "xlsx" : format
      });
      await saveDownloadResponse(res, fallback);
    } catch {
      setError("Export failed. Check the date range and try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Export my timesheet</CardTitle>
        <p className="text-xs text-muted-foreground">
          Download only your time entries for payroll or your records.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="export-from">From</Label>
          <Input
            id="export-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="export-to">To</Label>
          <Input
            id="export-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div className="space-y-1 min-w-[130px]">
          <Label>Report</Label>
          <Select
            value={reportType}
            onValueChange={(v) => setReportType(v as MemberExportReportType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time_entries">Time entries</SelectItem>
              <SelectItem value="by_category">By category</SelectItem>
              <SelectItem value="daily_summary">Daily summary</SelectItem>
              <SelectItem value="by_project">By project</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[140px]">
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
        <div className="space-y-1 min-w-[140px]">
          <Label>Category</Label>
          <Select
            value={categoryId || "__all__"}
            onValueChange={(v) => setCategoryId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[100px]">
          <Label>Billable</Label>
          <Select
            value={billable}
            onValueChange={(v) => setBillable(v as MemberExportBodyDto["billable"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="billable">Billable</SelectItem>
              <SelectItem value="non_billable">Non-billable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[100px]">
          <Label>Format</Label>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as MemberExportBodyDto["format"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={() => void runExport()} disabled={exporting}>
          {exporting ? "Exporting…" : "Download"}
        </Button>
        {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
