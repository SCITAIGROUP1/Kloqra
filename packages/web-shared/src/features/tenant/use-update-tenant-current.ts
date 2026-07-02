"use client";

import { ROUTES, type TenantDto, type UpdateTenantCurrentDto } from "@kloqra/contracts";
import { useCallback, useState } from "react";
import { api } from "../../api/client";
import { getWorkspaceId, useSessionStore } from "../../stores/session.store";

export function useUpdateTenantCurrent() {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTenantCurrent = useCallback(
    async (body: UpdateTenantCurrentDto): Promise<TenantDto> => {
      if (!ws) {
        throw new Error("No active workspace");
      }
      setSaving(true);
      setError(null);
      try {
        return await api<TenantDto>(ROUTES.TENANTS.CURRENT, {
          method: "PATCH",
          body: JSON.stringify(body),
          workspaceId: ws
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not update organization";
        setError(message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [ws]
  );

  return { updateTenantCurrent, saving, error };
}
