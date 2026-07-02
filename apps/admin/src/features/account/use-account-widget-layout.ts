import { createWidgetLayoutStore, type WidgetLayoutStore } from "@kloqra/web-shared";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widget-registry";

export type { WidgetLayoutItem };

export const useAccountWidgetLayout: WidgetLayoutStore = createWidgetLayoutStore({
  app: "platform",
  widgetRegistry: WIDGET_REGISTRY,
  defaultLayout: DEFAULT_LAYOUT,
  legacyStorage: {
    layoutKey: (tenantSlug) => `kloqra-account-widget-layout-${tenantSlug}`,
    defaultKey: (tenantSlug) => `kloqra-account-widget-layout-default-${tenantSlug}`
  }
});
