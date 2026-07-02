"use client";

import { ROUTES } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@kloqra/ui";
import { useTenantDataExport } from "@kloqra/web-shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";
import { getWorkspaceId } from "@/stores/session.store";

export function AccountDataPrivacyPage() {
  const workspaceId = getWorkspaceId() ?? "";
  const { job, loading, error, startExport, refreshJob } = useTenantDataExport();
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;
    setPolling(true);
    const timer = window.setInterval(() => {
      void refreshJob(job.id);
    }, 2000);
    return () => {
      window.clearInterval(timer);
      setPolling(false);
    };
  }, [job, refreshJob]);

  async function handleStartExport() {
    const created = await startExport();
    if (created) {
      toast.success("Organization export started. This may take a few minutes.");
    }
  }

  async function handleDownload() {
    if (!job || job.status !== "ready") return;
    try {
      const response = await apiDownloadGet(
        ROUTES.TENANTS.DATA_EXPORT_JOB_DOWNLOAD(job.id),
        workspaceId
      );
      saveDownloadResponse(response, job.filename ?? "organization-export.zip");
      toast.success("Export downloaded.");
    } catch {
      toast.error("Could not download export.");
    }
  }

  return (
    <div className="space-y-6">
      <AppBar
        title="Data & privacy"
        description="Export all organization data for portability or compliance requests."
      />
      <Card>
        <CardHeader>
          <CardTitle>Organization data export</CardTitle>
          <CardDescription>
            Downloads a ZIP archive with a manifest and time-entry exports for every workspace in
            your organization. Files are retained for 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {job ? (
            <div className="space-y-2 text-sm" data-testid="tenant-export-status">
              <p>
                <span className="text-muted-foreground">Status:</span> {job.status}
                {polling ? " (refreshing…)" : ""}
              </p>
              {job.errorMessage ? <p className="text-destructive">{job.errorMessage}</p> : null}
              {job.status === "ready" ? (
                <Button type="button" onClick={() => void handleDownload()}>
                  Download {job.filename ?? "export.zip"}
                </Button>
              ) : null}
            </div>
          ) : null}
          <Button
            type="button"
            disabled={loading || job?.status === "queued" || job?.status === "running"}
            onClick={() => void handleStartExport()}
            data-testid="start-tenant-export"
          >
            {loading ? "Starting…" : "Export all organization data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
