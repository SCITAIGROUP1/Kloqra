import { createWidgetLayoutStore, type WidgetLayoutStore } from "@kloqra/web-shared";
import {
  ACTIVE_DEFAULT_LAYOUT,
  ACTIVE_WIDGET_REGISTRY,
  type WidgetLayoutItem
} from "./widget-registry";

export type { WidgetLayoutItem };

export const useAccountWidgetLayout: WidgetLayoutStore = createWidgetLayoutStore({
  app: "platform",
  widgetRegistry: ACTIVE_WIDGET_REGISTRY,
  defaultLayout: ACTIVE_DEFAULT_LAYOUT,
  legacyStorage: {
    layoutKey: (tenantSlug) => `kloqra-account-widget-layout-${tenantSlug}`,
    defaultKey: (tenantSlug) => `kloqra-account-widget-layout-default-${tenantSlug}`
  }
});
