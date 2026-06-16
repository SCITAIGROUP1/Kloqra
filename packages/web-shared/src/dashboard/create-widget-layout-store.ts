import type { DashboardApp, WidgetLayoutItemDto } from "@kloqra/contracts";
import { create } from "zustand";
import {
  clearLegacyLayouts,
  fetchDashboardLayout,
  readLegacyLayouts,
  saveDashboardLayout,
  type LegacyDashboardLayoutStorage
} from "./dashboard-layout-api";

export interface WidgetRegistryEntry {
  id: string;
  defaultVisible: boolean;
  defaultSize: { w: number; h: number };
}

export type WidgetLayoutItem = WidgetLayoutItemDto;

export interface WidgetLayoutState {
  layoutsByWorkspace: Record<string, WidgetLayoutItem[]>;
  initialized: boolean;
  loadingByWorkspace: Record<string, boolean>;

  initialize: (workspaceId: string) => Promise<void>;
  updateLayout: (
    workspaceId: string,
    rglLayout: unknown[],
    options?: { persist?: boolean }
  ) => void;
  persistLayout: (workspaceId: string) => Promise<void>;
  saveLayoutAsDefault: (workspaceId: string) => Promise<void>;
  restoreLayout: (workspaceId: string, layout: WidgetLayoutItem[]) => void;
  toggleWidget: (workspaceId: string, id: string) => Promise<void>;
  resetLayout: (workspaceId: string) => Promise<void>;
}

type CreateWidgetLayoutStoreOptions = {
  app: DashboardApp;
  widgetRegistry: WidgetRegistryEntry[];
  defaultLayout: WidgetLayoutItem[];
  legacyStorage: LegacyDashboardLayoutStorage;
};

function mergeLayoutsWithRegistry(
  savedLayouts: WidgetLayoutItem[],
  widgetRegistry: WidgetRegistryEntry[],
  defaultLayout: WidgetLayoutItem[]
): WidgetLayoutItem[] {
  const finalLayouts: WidgetLayoutItem[] = [];

  for (const registryWidget of widgetRegistry) {
    const saved = savedLayouts.find((item) => item.i === registryWidget.id);
    if (saved) {
      finalLayouts.push({
        i: saved.i,
        x: saved.x,
        y: saved.y,
        w: saved.w,
        h: saved.h,
        visible: typeof saved.visible === "boolean" ? saved.visible : registryWidget.defaultVisible
      });
    } else {
      const defaultItem = defaultLayout.find((item) => item.i === registryWidget.id);
      if (defaultItem) {
        finalLayouts.push({ ...defaultItem });
      } else {
        finalLayouts.push({
          i: registryWidget.id,
          x: 0,
          y: 99,
          w: registryWidget.defaultSize.w,
          h: registryWidget.defaultSize.h,
          visible: registryWidget.defaultVisible
        });
      }
    }
  }

  return finalLayouts;
}

function resolveInitialLayouts(
  stored: WidgetLayoutItem[] | null | undefined,
  fallback: WidgetLayoutItem[] | null | undefined,
  widgetRegistry: WidgetRegistryEntry[],
  defaultLayout: WidgetLayoutItem[]
): WidgetLayoutItem[] {
  const source = stored?.length ? stored : fallback?.length ? fallback : null;
  if (source) {
    return mergeLayoutsWithRegistry(source, widgetRegistry, defaultLayout);
  }
  return mergeLayoutsWithRegistry(defaultLayout, widgetRegistry, defaultLayout);
}

const initializePromises = new Map<string, Promise<void>>();

export function createWidgetLayoutStore(options: CreateWidgetLayoutStoreOptions) {
  const { app, widgetRegistry, defaultLayout, legacyStorage } = options;

  async function persistToServer(
    workspaceId: string,
    layout: WidgetLayoutItem[],
    defaultLayoutItems?: WidgetLayoutItem[]
  ) {
    await saveDashboardLayout(workspaceId, {
      app,
      layout,
      ...(defaultLayoutItems ? { defaultLayout: defaultLayoutItems } : {})
    });
  }

  return create<WidgetLayoutState>((set, get) => ({
    layoutsByWorkspace: {},
    initialized: false,
    loadingByWorkspace: {},

    initialize: async (workspaceId: string) => {
      if (!workspaceId) return;

      if (get().layoutsByWorkspace[workspaceId]?.length) {
        set({ initialized: true });
        return;
      }

      const inflight = initializePromises.get(workspaceId);
      if (inflight) {
        await inflight;
        return;
      }

      const run = (async () => {
        set((state) => ({
          loadingByWorkspace: { ...state.loadingByWorkspace, [workspaceId]: true }
        }));

        try {
          let remote = await fetchDashboardLayout(workspaceId, app);
          const legacy = readLegacyLayouts(workspaceId, legacyStorage);
          const needsMigration =
            !remote.layout?.length &&
            !remote.defaultLayout?.length &&
            (legacy.layout?.length || legacy.defaultLayout?.length);

          if (needsMigration) {
            await saveDashboardLayout(workspaceId, {
              app,
              ...(legacy.layout?.length ? { layout: legacy.layout } : {}),
              ...(legacy.defaultLayout?.length ? { defaultLayout: legacy.defaultLayout } : {})
            });
            clearLegacyLayouts(workspaceId, legacyStorage);
            remote = await fetchDashboardLayout(workspaceId, app);
          }

          const finalLayouts = resolveInitialLayouts(
            remote.layout,
            remote.defaultLayout,
            widgetRegistry,
            defaultLayout
          );

          set((state) => ({
            layoutsByWorkspace: {
              ...state.layoutsByWorkspace,
              [workspaceId]: finalLayouts
            },
            initialized: true,
            loadingByWorkspace: { ...state.loadingByWorkspace, [workspaceId]: false }
          }));
        } catch (e) {
          console.error("Failed to load dashboard layout", e);
          const finalLayouts = mergeLayoutsWithRegistry(
            defaultLayout.map((item) => ({ ...item })),
            widgetRegistry,
            defaultLayout
          );
          set((state) => ({
            layoutsByWorkspace: {
              ...state.layoutsByWorkspace,
              [workspaceId]: finalLayouts
            },
            initialized: true,
            loadingByWorkspace: { ...state.loadingByWorkspace, [workspaceId]: false }
          }));
        }
      })();

      initializePromises.set(workspaceId, run);
      try {
        await run;
      } finally {
        initializePromises.delete(workspaceId);
      }
    },

    updateLayout: (workspaceId: string, rglLayout: unknown[], options?: { persist?: boolean }) => {
      if (!workspaceId) return;

      set((state) => {
        const currentLayouts = state.layoutsByWorkspace[workspaceId] || [];
        const updated = currentLayouts.map((item) => {
          const rglItem = (
            rglLayout as { i: string; x: number; y: number; w: number; h: number }[]
          ).find((r) => r.i === item.i);
          if (rglItem) {
            return {
              ...item,
              x: rglItem.x,
              y: rglItem.y,
              w: rglItem.w,
              h: rglItem.h
            };
          }
          return item;
        });

        if (options?.persist !== false) {
          void persistToServer(workspaceId, updated).catch((err) => {
            console.error("Failed to save dashboard layout", err);
          });
        }

        return {
          layoutsByWorkspace: {
            ...state.layoutsByWorkspace,
            [workspaceId]: updated
          }
        };
      });
    },

    persistLayout: async (workspaceId: string) => {
      if (!workspaceId) return;
      const layout = get().layoutsByWorkspace[workspaceId];
      if (!layout) return;
      await persistToServer(workspaceId, layout);
    },

    saveLayoutAsDefault: async (workspaceId: string) => {
      if (!workspaceId) return;
      const layout = get().layoutsByWorkspace[workspaceId];
      if (!layout) return;
      await persistToServer(workspaceId, layout, layout);
    },

    restoreLayout: (workspaceId: string, layout: WidgetLayoutItem[]) => {
      if (!workspaceId) return;

      set((state) => ({
        layoutsByWorkspace: {
          ...state.layoutsByWorkspace,
          [workspaceId]: layout.map((item) => ({ ...item }))
        }
      }));
    },

    toggleWidget: async (workspaceId: string, id: string) => {
      if (!workspaceId) return;

      const currentLayouts = get().layoutsByWorkspace[workspaceId] || [];
      const updated = currentLayouts.map((item) => {
        if (item.i === id) {
          return { ...item, visible: !item.visible };
        }
        return item;
      });

      set((state) => ({
        layoutsByWorkspace: {
          ...state.layoutsByWorkspace,
          [workspaceId]: updated
        }
      }));

      await persistToServer(workspaceId, updated);
    },

    resetLayout: async (workspaceId: string) => {
      if (!workspaceId) return;

      let resetLayoutItems = mergeLayoutsWithRegistry(
        defaultLayout.map((item) => ({ ...item })),
        widgetRegistry,
        defaultLayout
      );

      const remote = await fetchDashboardLayout(workspaceId, app);
      if (remote.defaultLayout?.length) {
        resetLayoutItems = mergeLayoutsWithRegistry(
          remote.defaultLayout,
          widgetRegistry,
          defaultLayout
        );
      }
      await persistToServer(workspaceId, resetLayoutItems);

      set((state) => ({
        layoutsByWorkspace: {
          ...state.layoutsByWorkspace,
          [workspaceId]: resetLayoutItems
        }
      }));
    }
  }));
}

export type WidgetLayoutStore = ReturnType<typeof createWidgetLayoutStore>;
