"use client";

import {
  ROUTES,
  tablePaginationQuery,
  type ListPlatformAuditEventsQuery,
  type ListPlatformAuditEventsResponseDto,
  type PlatformAuditAction
} from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function usePlatformAuditEvents(query: ListPlatformAuditEventsQuery) {
  const [data, setData] = useState<ListPlatformAuditEventsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(
        tablePaginationQuery(
          query.page,
          undefined,
          {
            ...(query.tenantId ? { tenantId: query.tenantId } : {}),
            ...(query.action ? { action: query.action } : {}),
            ...(query.from ? { from: query.from } : {}),
            ...(query.to ? { to: query.to } : {})
          },
          query.limit
        )
      );
      const result = await api<ListPlatformAuditEventsResponseDto>(
        `${ROUTES.PLATFORM.AUDIT_EVENTS}?${params.toString()}`
      );
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load audit events");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query.action, query.from, query.limit, query.page, query.tenantId, query.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export type { PlatformAuditAction };
