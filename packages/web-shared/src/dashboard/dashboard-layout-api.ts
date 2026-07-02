import type {
  DashboardApp,
  DashboardLayoutResponseDto,
  UpdateDashboardLayoutDto,
  WidgetLayoutItemDto
} from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";

export async function fetchDashboardLayout(
  workspaceId: string,
  app: DashboardApp
): Promise<DashboardLayoutResponseDto> {
  if (app === "platform" && process.env.NEXT_PUBLIC_AUTH_SCOPE !== "platform") {
    return { layout: null, defaultLayout: null };
  }
  const params = new URLSearchParams({ app });
  if (app === "platform") {
    return api<DashboardLayoutResponseDto>(`${ROUTES.PLATFORM.ME_DASHBOARD_LAYOUT}?${params}`);
  }
  return api<DashboardLayoutResponseDto>(`${ROUTES.USERS.DASHBOARD_LAYOUT}?${params}`, {
    workspaceId
  });
}

export async function saveDashboardLayout(
  workspaceId: string,
  update: UpdateDashboardLayoutDto
): Promise<DashboardLayoutResponseDto> {
  if (update.app === "platform" && process.env.NEXT_PUBLIC_AUTH_SCOPE !== "platform") {
    return { layout: null, defaultLayout: null };
  }
  if (update.app === "platform") {
    return api<DashboardLayoutResponseDto>(ROUTES.PLATFORM.ME_DASHBOARD_LAYOUT, {
      method: "PUT",
      body: JSON.stringify(update)
    });
  }
  return api<DashboardLayoutResponseDto>(ROUTES.USERS.DASHBOARD_LAYOUT, {
    method: "PUT",
    workspaceId,
    body: JSON.stringify(update)
  });
}

export type LegacyDashboardLayoutStorage = {
  layoutKey: (workspaceId: string) => string;
  defaultKey: (workspaceId: string) => string;
};

export function readLegacyLayouts(
  workspaceId: string,
  keys: LegacyDashboardLayoutStorage
): { layout: WidgetLayoutItemDto[] | null; defaultLayout: WidgetLayoutItemDto[] | null } {
  if (typeof window === "undefined") {
    return { layout: null, defaultLayout: null };
  }

  try {
    const layoutRaw = localStorage.getItem(keys.layoutKey(workspaceId));
    const defaultRaw = localStorage.getItem(keys.defaultKey(workspaceId));
    return {
      layout: layoutRaw ? (JSON.parse(layoutRaw) as WidgetLayoutItemDto[]) : null,
      defaultLayout: defaultRaw ? (JSON.parse(defaultRaw) as WidgetLayoutItemDto[]) : null
    };
  } catch {
    return { layout: null, defaultLayout: null };
  }
}

export function clearLegacyLayouts(workspaceId: string, keys: LegacyDashboardLayoutStorage) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(keys.layoutKey(workspaceId));
  localStorage.removeItem(keys.defaultKey(workspaceId));
}
