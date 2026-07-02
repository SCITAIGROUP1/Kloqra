"use client";

import { ROUTES, type TenantDataExportJobDto } from "@kloqra/contracts";
import { useCallback, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useTenantDataExport() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [job, setJob] = useState<TenantDataExportJobDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startExport = useCallback(async () => {
    if (!ws) return null;
    setLoading(true);
    setError(null);
    try {
      const created = await api<TenantDataExportJobDto>(ROUTES.TENANTS.DATA_EXPORT, {
        method: "POST",
        body: JSON.stringify({}),
        workspaceId: ws
      });
      setJob(created);
      return created;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start export");
      return null;
    } finally {
      setLoading(false);
    }
  }, [ws]);

  const refreshJob = useCallback(
    async (jobId: string) => {
      if (!ws) return null;
      try {
        const current = await api<TenantDataExportJobDto>(ROUTES.TENANTS.DATA_EXPORT_JOB(jobId), {
          workspaceId: ws
        });
        setJob(current);
        return current;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not refresh export status");
        return null;
      }
    },
    [ws]
  );

  return { job, loading, error, startExport, refreshJob, setJob };
}
