import type { TenantStatus } from "@kloqra/contracts";
import type { DashboardStatTone } from "@kloqra/ui";

export function formatTenantStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export function tenantStatusTone(status: TenantStatus): DashboardStatTone {
  switch (status) {
    case "active":
      return "success";
    case "suspended":
    case "churned":
      return "warning";
    default:
      return "primary";
  }
}
