import { z } from "zod";
import { uuidSchema } from "./dto/common.dto";
import type { UserPreferences } from "./user-preferences";

export const dashboardAppSchema = z.enum(["client", "admin", "platform"]);
export type DashboardApp = z.infer<typeof dashboardAppSchema>;

export const widgetLayoutItemSchema = z.object({
  i: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  visible: z.boolean()
});

export type WidgetLayoutItemDto = z.infer<typeof widgetLayoutItemSchema>;

const workspaceAppDashboardLayoutSchema = z.object({
  layout: z.array(widgetLayoutItemSchema).optional(),
  defaultLayout: z.array(widgetLayoutItemSchema).optional()
});

export const workspaceDashboardLayoutsSchema = z.object({
  client: workspaceAppDashboardLayoutSchema.optional(),
  admin: workspaceAppDashboardLayoutSchema.optional()
});

export type WorkspaceDashboardLayouts = z.infer<typeof workspaceDashboardLayoutsSchema>;

export const dashboardLayoutQuerySchema = z.object({
  app: dashboardAppSchema
});

export const dashboardLayoutResponseSchema = z.object({
  layout: z.array(widgetLayoutItemSchema).nullable(),
  defaultLayout: z.array(widgetLayoutItemSchema).nullable()
});

export const updateDashboardLayoutSchema = z
  .object({
    app: dashboardAppSchema,
    layout: z.array(widgetLayoutItemSchema).optional(),
    defaultLayout: z.array(widgetLayoutItemSchema).optional()
  })
  .refine((data) => data.layout !== undefined || data.defaultLayout !== undefined, {
    message: "At least one of layout or defaultLayout is required"
  });

export type DashboardLayoutQueryDto = z.infer<typeof dashboardLayoutQuerySchema>;
export type DashboardLayoutResponseDto = z.infer<typeof dashboardLayoutResponseSchema>;
export type UpdateDashboardLayoutDto = z.infer<typeof updateDashboardLayoutSchema>;

export function getWorkspaceDashboardLayout(
  preferences: UserPreferences,
  workspaceId: string,
  app: DashboardApp
): { layout?: WidgetLayoutItemDto[]; defaultLayout?: WidgetLayoutItemDto[] } {
  if (app === "platform") return {};
  const bundle = preferences.dashboardLayouts?.[workspaceId]?.[app as "client" | "admin"];
  return bundle ?? {};
}

export function mergeDashboardLayoutUpdate(
  preferences: UserPreferences,
  workspaceId: string,
  update: UpdateDashboardLayoutDto
): UserPreferences {
  if (update.app === "platform") return preferences;
  const dashboards = { ...(preferences.dashboardLayouts ?? {}) };
  const workspaceBundle = { ...(dashboards[workspaceId] ?? {}) };
  const appBundle = { ...(workspaceBundle[update.app as "client" | "admin"] ?? {}) };

  if (update.layout !== undefined) {
    appBundle.layout = update.layout;
  }
  if (update.defaultLayout !== undefined) {
    appBundle.defaultLayout = update.defaultLayout;
  }

  workspaceBundle[update.app as "client" | "admin"] = appBundle;
  dashboards[workspaceId] = workspaceBundle;

  return {
    ...preferences,
    dashboardLayouts: dashboards
  };
}

/** Validates stored dashboard layout maps on user preferences. */
export const userDashboardLayoutsSchema = z.record(uuidSchema, workspaceDashboardLayoutsSchema);
