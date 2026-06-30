"use client";

import { ROUTES, type ExportJobDto } from "@kloqra/contracts";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kloqra/ui";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";

type Props = {
  workspaceId: string;
  refreshKey?: number;
};

function statusLabel(status: ExportJobDto["status"]): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Preparing…";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function ExportHistoryPanel({ workspaceId, refreshKey = 0 }: Props) {
  const [jobs, setJobs] = useState<ExportJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await api<ExportJobDto[]>(ROUTES.EXPORT.JOBS, { workspaceId });
      setJobs(list);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!jobs.some((j) => j.status === "queued" || j.status === "running")) return;
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [jobs, load]);

  async function downloadJob(job: ExportJobDto) {
    if (!job.filename) return;
    setBusyId(job.id);
    try {
      const res = await apiDownloadGet(ROUTES.EXPORT.JOB_DOWNLOAD(job.id), workspaceId);
      await saveDownloadResponse(res, job.filename);
      toast.success("Export downloaded.");
    } catch {
      toast.error("Could not download this export.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent exports</CardTitle>
        <CardDescription>Large exports and recent downloads are kept for 7 days.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading export history…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent exports yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="min-w-0">
                  <strong className="break-all">
                    {job.filename ?? job.body.exportPurpose ?? "Export"}
                  </strong>
                  <span className="block text-xs text-muted-foreground">
                    {statusLabel(job.status)}
                    {job.errorMessage ? ` · ${job.errorMessage}` : ""}
                  </span>
                </span>
                {job.status === "ready" && job.filename ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === job.id}
                    onClick={() => void downloadJob(job)}
                  >
                    Download
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
