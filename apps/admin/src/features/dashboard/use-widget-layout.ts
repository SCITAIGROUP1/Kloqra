import { createWidgetLayoutStore, type WidgetLayoutStore } from "@kloqra/web-shared";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widget-registry";

export type { WidgetLayoutItem };

export const useWidgetLayout: WidgetLayoutStore = createWidgetLayoutStore({
  app: "admin",
  widgetRegistry: WIDGET_REGISTRY,
  defaultLayout: DEFAULT_LAYOUT,
  legacyStorage: {
    layoutKey: (workspaceId) => `kloqra-widget-layout-${workspaceId}`,
    defaultKey: (workspaceId) => `kloqra-widget-layout-default-${workspaceId}`
  }
});
