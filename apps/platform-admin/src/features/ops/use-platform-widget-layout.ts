import { createWidgetLayoutStore, type WidgetLayoutStore } from "@kloqra/web-shared";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widget-registry";

export type { WidgetLayoutItem };

export const usePlatformWidgetLayout: WidgetLayoutStore = createWidgetLayoutStore({
  app: "platform",
  widgetRegistry: WIDGET_REGISTRY,
  defaultLayout: DEFAULT_LAYOUT,
  legacyStorage: {
    layoutKey: (userId) => `kloqra-platform-widget-layout-${userId}`,
    defaultKey: (userId) => `kloqra-platform-widget-layout-default-${userId}`
  }
});
