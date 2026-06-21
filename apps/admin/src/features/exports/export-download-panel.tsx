"use client";

import {
  ROUTES,
  buildExportFilename,
  buildExportScopeHint,
  type CreateExportScheduleDto,
  type ExportBodyDto,
  type ExportJobDto,
  type ExportPreviewBodyDto,
  type ExportPreviewResponseDto,
  type ProjectDto,
  type ReportShareDto
} from "@kloqra/contracts";
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
} from "@kloqra/ui";
import { ChevronDown, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExportAppliedScopeSummary } from "./export-applied-scope-summary";
import { ExportPreviewStatus } from "./export-preview-status";
import type { ScopeMember } from "./export-scope-filters";
import { SegmentedControl } from "@/components/admin-page";
import { ExportLayoutPreview } from "@/components/export-layout-preview";
import { ExportSamplePreview } from "@/components/export-sample-preview";
import { api } from "@/lib/api";
import { apiDownloadGet, apiDownloadPost, saveDownloadResponse } from "@/lib/download";
import { describeOrganize } from "@/lib/export-organize";

const FORMAT_HINTS: Record<ExportBodyDto["format"], string> = {
  xlsx: "Best for payroll and billing",
  csv: "Opens in any spreadsheet · multiple sections become a ZIP",
  pdf: "Summary only — use Excel for full detail",
  json: "Machine-readable data for integrations and scripts"
};

export const LARGE_EXPORT_BANNER =
  "Large exports are prepared in the background and appear under Recent exports (kept 7 days).";

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  periodLabel: string;
  exportBody: ExportBodyDto;
  previewBody: ExportPreviewBodyDto;
  preview: ExportPreviewResponseDto | null;
  previewLoading: boolean;
  previewError: string | null;
  format: ExportBodyDto["format"];
  onFormatChange: (format: ExportBodyDto["format"]) => void;
  purposeSlug: string;
  projectIds?: string[];
  userIds?: string[];
  projects?: Pick<ProjectDto, "id" | "name" | "color">[];
  members?: ScopeMember[];
  categoryName?: string;
  taskName?: string;
  teamOnly?: boolean;
  projectNames?: string[];
  userNames?: string[];
  downloadLabel?: string;
  canExport: boolean;
  layoutWarning?: string | null;
  organizeDescription?: string;
  showSchedule?: boolean;
  onJobCreated?: () => void;
};

export function ExportDownloadPanel({
  workspaceId,
  workspaceSlug,
  periodLabel,
  exportBody,
  previewBody,
  preview,
  previewLoading,
  previewError,
  format,
  onFormatChange,
  purposeSlug,
  projectIds = [],
  userIds = [],
  projects = [],
  members = [],
  categoryName,
  taskName,
  teamOnly = false,
  projectNames,
  userNames,
  downloadLabel = "Download",
  canExport,
  layoutWarning,
  organizeDescription,
  showSchedule = false,
  onJobCreated
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiryDays, setShareExpiryDays] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFrequency, setScheduleFrequency] =
    useState<CreateExportScheduleDto["frequency"]>("weekly");
  const [scheduleEmails, setScheduleEmails] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const ext =
    format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : format === "json" ? "json" : "csv";
  const scopeHint = buildExportScopeHint({
    projectIds: exportBody.projectIds,
    userIds: exportBody.userIds,
    projectNames,
    userNames
  });
  const filename = buildExportFilename({
    workspaceSlug,
    from: exportBody.from,
    to: exportBody.to,
    ext,
    purposeSlug: exportBody.exportPurpose ?? purposeSlug,
    scopeHint
  });

  const organizeCopy =
    organizeDescription ??
    describeOrganize({ sheetLayout: exportBody.sheetLayout, groupBy: exportBody.groupBy });

  const warnLarge = preview?.warnLargeExport ?? false;
  const isEmpty = !!preview?.isEmpty && !previewLoading && !previewError;
  const canDownload = canExport && !exporting && !isEmpty;

  useEffect(() => {
    if (!activeJobId || !workspaceId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const job = await api<ExportJobDto>(ROUTES.EXPORT.JOB(activeJobId), { workspaceId });
        if (cancelled) return;
        if (job.status === "ready" && job.filename) {
          const res = await apiDownloadGet(ROUTES.EXPORT.JOB_DOWNLOAD(job.id), workspaceId);
          await saveDownloadResponse(res, job.filename);
          toast.success("Export downloaded.");
          setActiveJobId(null);
          setExporting(false);
          onJobCreated?.();
        } else if (job.status === "failed") {
          setError(job.errorMessage ?? "Export failed.");
          toast.error(job.errorMessage ?? "Export failed.");
          setActiveJobId(null);
          setExporting(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not check export status.");
          setActiveJobId(null);
          setExporting(false);
        }
      }
    };
    const timer = setInterval(() => void poll(), 3000);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeJobId, workspaceId, onJobCreated]);

  async function runExport() {
    setError(null);
    setExporting(true);
    try {
      if (warnLarge) {
        const job = await api<ExportJobDto>(ROUTES.EXPORT.JOBS, {
          method: "POST",
          workspaceId,
          body: JSON.stringify(exportBody)
        });
        setActiveJobId(job.id);
        toast.success("Large export queued — we'll download it when ready.");
        onJobCreated?.();
        return;
      }
      const res = await apiDownloadPost(ROUTES.EXPORT.GENERATE, workspaceId, exportBody);
      await saveDownloadResponse(res, filename);
      toast.success("Export downloaded.");
    } catch (e) {
      const message =
        e instanceof Error && e.message.includes("404")
          ? "No data found for these filters. Try widening the date range."
          : "Export failed. Check your filters and try again.";
      setError(message);
      toast.error(message);
      setExporting(false);
    } finally {
      if (!warnLarge) setExporting(false);
    }
  }

  async function createShareLink() {
    if (!workspaceId) return;
    setSharing(true);
    setShareUrl(null);
    try {
      const result = await api<ReportShareDto>(ROUTES.EXPORT.SHARES, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({
          body: previewBody,
          expiresInDays: Number(shareExpiryDays)
        })
      });
      setShareUrl(result.shareUrl);
      setError(null);
      toast.success("Share link created.");
    } catch (e) {
      const message =
        e instanceof Error ? `Share link failed: ${e.message}` : "Could not create share link.";
      setError(message);
      toast.error(message);
    } finally {
      setSharing(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Could not copy link.");
    }
  }

  async function createSchedule() {
    const recipientEmails = scheduleEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipientEmails.length === 0) {
      toast.error("Enter at least one email address.");
      return;
    }
    setScheduling(true);
    try {
      await api(ROUTES.EXPORT.SCHEDULES, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({
          name: scheduleName || downloadLabel,
          frequency: scheduleFrequency,
          recipientEmails,
          body: exportBody,
          enabled: true
        } satisfies CreateExportScheduleDto)
      });
      toast.success("Export schedule created.");
      setShowScheduleForm(false);
      setScheduleName("");
      setScheduleEmails("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create schedule.");
    } finally {
      setScheduling(false);
    }
  }

  const alertMessage = layoutWarning ?? (warnLarge ? LARGE_EXPORT_BANNER : null);

  return (
    <Card className="min-w-0 overflow-hidden border-primary/10 shadow-md">
      <CardHeader className="pb-3 bg-muted/20 border-b border-border/60 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">Review & download</CardTitle>
            <CardDescription>Live preview reflects the filters and period below.</CardDescription>
          </div>
          <ExportPreviewStatus
            loading={previewLoading}
            preview={preview}
            error={previewError}
            className="w-fit max-w-full"
          />
        </div>
        <div
          className={`rounded-lg border px-3 py-2.5 transition-colors ${
            previewLoading
              ? "border-primary/25 bg-primary/5"
              : "border-primary/35 bg-primary/10 ring-1 ring-primary/15"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Applied period
          </p>
          <p className="break-words text-sm font-semibold text-foreground">{periodLabel}</p>
        </div>
        <ExportAppliedScopeSummary
          compact
          projectIds={projectIds}
          userIds={userIds}
          projectNames={projectNames}
          userNames={userNames}
          projects={projects}
          members={members}
          categoryName={categoryName}
          taskName={taskName}
          teamOnly={teamOnly}
          previewLoading={previewLoading}
        />
      </CardHeader>

      <CardContent className="space-y-0 p-0">
        {/* Preview block */}
        <div
          className={`px-4 py-4 ${isEmpty ? "bg-status-warning-bg/40" : previewError ? "bg-destructive/5" : "bg-muted/10"}`}
        >
          <ExportLayoutPreview
            preview={preview}
            loading={previewLoading}
            error={previewError}
            format={format}
            organizeDescription={organizeCopy}
            selectedReportTypes={previewBody.reportTypes}
          />
          {!previewLoading && !previewError && !isEmpty ? (
            <ExportSamplePreview sampleRows={preview?.sampleRows} />
          ) : null}
        </div>

        {/* Download block */}
        <div className="space-y-4 border-t border-border/60 px-4 py-4">
          {alertMessage ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              {alertMessage}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">File format</Label>
            <SegmentedControl
              value={format}
              onChange={onFormatChange}
              size="md"
              fullWidth
              options={[
                { value: "xlsx", label: "Excel" },
                { value: "csv", label: "CSV" },
                { value: "pdf", label: "PDF" },
                { value: "json", label: "JSON" }
              ]}
            />
            <p className="text-[11px] text-muted-foreground">{FORMAT_HINTS[format]}</p>
          </div>

          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => void runExport()}
              disabled={!canDownload}
            >
              <Download className="size-4 shrink-0" aria-hidden />
              {exporting
                ? activeJobId
                  ? "Preparing your file…"
                  : "Preparing download…"
                : warnLarge
                  ? "Prepare large export"
                  : downloadLabel}
            </Button>
            <p
              className="text-center text-[11px] text-muted-foreground truncate px-1"
              title={filename}
            >
              {filename}
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {/* Collapsible more options */}
          <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowMoreOptions((v) => !v)}
            >
              <span>Email & share options</span>
              <ChevronDown
                className={`size-4 shrink-0 transition-transform ${showMoreOptions ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {showMoreOptions ? (
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => void createShareLink()}
                    disabled={sharing || isEmpty}
                  >
                    {sharing ? "Creating link…" : "Create read-only share link"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] text-muted-foreground shrink-0">
                      Link expires
                    </Label>
                    <Select value={shareExpiryDays} onValueChange={setShareExpiryDays}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {shareUrl ? (
                    <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
                      <p className="text-[11px] font-medium text-foreground">Share link ready</p>
                      <p className="text-[11px] break-all text-muted-foreground line-clamp-2">
                        {shareUrl}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void copyShareLink()}
                        >
                          Copy link
                        </Button>
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <a href={shareUrl} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {showSchedule ? (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-primary hover:underline"
                      onClick={() => setShowScheduleForm((v) => !v)}
                    >
                      {showScheduleForm ? "Hide email schedule" : "Schedule recurring email"}
                    </button>
                    {showScheduleForm ? (
                      <div className="space-y-3 rounded-md border border-border bg-muted/10 p-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Schedule name</Label>
                          <Input
                            value={scheduleName}
                            onChange={(e) => setScheduleName(e.target.value)}
                            placeholder={downloadLabel}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">How often</Label>
                          <Select
                            value={scheduleFrequency}
                            onValueChange={(v) =>
                              setScheduleFrequency(v as CreateExportScheduleDto["frequency"])
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Send to (comma-separated emails)</Label>
                          <Input
                            value={scheduleEmails}
                            onChange={(e) => setScheduleEmails(e.target.value)}
                            placeholder="payroll@company.com"
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          className="w-full"
                          size="sm"
                          disabled={scheduling}
                          onClick={() => void createSchedule()}
                        >
                          {scheduling ? "Saving…" : "Create schedule"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
