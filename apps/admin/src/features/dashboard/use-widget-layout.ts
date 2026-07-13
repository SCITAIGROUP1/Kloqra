import { createWidgetLayoutStore, type WidgetLayoutStore } from "@kloqra/web-shared";
import {
  ACTIVE_DEFAULT_LAYOUT,
  ACTIVE_WIDGET_REGISTRY,
  type WidgetLayoutItem
} from "./widget-registry";

export type { WidgetLayoutItem };

export const useWidgetLayout: WidgetLayoutStore = createWidgetLayoutStore({
  app: "admin",
  widgetRegistry: ACTIVE_WIDGET_REGISTRY,
  defaultLayout: ACTIVE_DEFAULT_LAYOUT,
  legacyStorage: {
    layoutKey: (workspaceId) => `kloqra-widget-layout-${workspaceId}`,
    defaultKey: (workspaceId) => `kloqra-widget-layout-default-${workspaceId}`
  }
});
