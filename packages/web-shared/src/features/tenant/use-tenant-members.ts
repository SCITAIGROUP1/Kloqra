"use client";

import { ROUTES, type TenantMemberDto } from "@kloqra/contracts";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useTenantMembers() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [members, setMembers] = useState<TenantMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ws) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api<TenantMemberDto[]>(ROUTES.TENANTS.MEMBERS, { workspaceId: ws });
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load organization members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { members, loading, error, reload };
}
