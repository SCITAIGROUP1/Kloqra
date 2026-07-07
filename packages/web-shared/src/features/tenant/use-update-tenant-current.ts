"use client";

import { ROUTES, type TenantDto, type UpdateTenantCurrentDto } from "@kloqra/contracts";
import { useCallback, useState } from "react";
import { api } from "../../api/client";
import { tenantApiOptions, useTenantApiWorkspaceId } from "./tenant-api-workspace";

export function useUpdateTenantCurrent() {
  const workspaceId = useTenantApiWorkspaceId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTenantCurrent = useCallback(
    async (body: UpdateTenantCurrentDto): Promise<TenantDto> => {
      setSaving(true);
      setError(null);
      try {
        return await api<TenantDto>(ROUTES.TENANTS.CURRENT, {
          method: "PATCH",
          body: JSON.stringify(body),
          ...tenantApiOptions(workspaceId)
        });
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "We couldn't save your organization profile. Please try again.";
        setError(message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [workspaceId]
  );

  return { updateTenantCurrent, saving, error };
}
