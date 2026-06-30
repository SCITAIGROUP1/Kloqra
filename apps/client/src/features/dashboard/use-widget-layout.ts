import { createWidgetLayoutStore, type WidgetLayoutStore } from "@kloqra/web-shared";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widget-registry";

export type { WidgetLayoutItem };

export const useWidgetLayout: WidgetLayoutStore = createWidgetLayoutStore({
  app: "client",
  widgetRegistry: WIDGET_REGISTRY,
  defaultLayout: DEFAULT_LAYOUT,
  legacyStorage: {
    layoutKey: (workspaceId) => `kloqra-member-layout-v3-${workspaceId}`,
    defaultKey: (workspaceId) => `kloqra-member-layout-v3-default-${workspaceId}`
  }
});
