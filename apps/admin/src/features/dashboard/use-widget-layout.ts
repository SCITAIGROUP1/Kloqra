import { create } from "zustand";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widget-registry";

interface WidgetLayoutState {
  layoutsByWorkspace: Record<string, WidgetLayoutItem[]>;
  initialized: boolean;

  // Actions
  initialize: (workspaceId: string) => void;
  updateLayout: (workspaceId: string, rglLayout: any[]) => void;
  toggleWidget: (workspaceId: string, id: string) => void;
  resetLayout: (workspaceId: string) => void;
}

const getStorageKey = (workspaceId: string) => `chronomint-widget-layout-${workspaceId}`;

export const useWidgetLayout = create<WidgetLayoutState>((set) => ({
  layoutsByWorkspace: {},
  initialized: false,

  initialize: (workspaceId: string) => {
    if (!workspaceId) return;

    let savedLayouts: WidgetLayoutItem[] = [];
    const storageKey = getStorageKey(workspaceId);

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        savedLayouts = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse saved widget layout", e);
    }

    // Merge with latest registry to ensure new widgets are included
    const finalLayouts: WidgetLayoutItem[] = [];

    // Start with all widgets from registry
    for (const registryWidget of WIDGET_REGISTRY) {
      const saved = savedLayouts.find((item) => item.i === registryWidget.id);
      if (saved) {
        // Use saved properties, but keep the current structure
        finalLayouts.push({
          i: saved.i,
          x: saved.x,
          y: saved.y,
          w: saved.w,
          h: saved.h,
          visible:
            typeof saved.visible === "boolean" ? saved.visible : registryWidget.defaultVisible
        });
      } else {
        // Not saved yet, load default layout item
        const defaultItem = DEFAULT_LAYOUT.find((item) => item.i === registryWidget.id);
        if (defaultItem) {
          finalLayouts.push({ ...defaultItem });
        } else {
          // Fallback if not in DEFAULT_LAYOUT for some reason
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

    set((state) => ({
      layoutsByWorkspace: {
        ...state.layoutsByWorkspace,
        [workspaceId]: finalLayouts
      },
      initialized: true
    }));
  },

  updateLayout: (workspaceId: string, rglLayout: any[]) => {
    if (!workspaceId) return;

    set((state) => {
      const currentLayouts = state.layoutsByWorkspace[workspaceId] || [];
      const updated = currentLayouts.map((item) => {
        const rglItem = rglLayout.find((r) => r.i === item.i);
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

      try {
        localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save widget layout", e);
      }

      return {
        layoutsByWorkspace: {
          ...state.layoutsByWorkspace,
          [workspaceId]: updated
        }
      };
    });
  },

  toggleWidget: (workspaceId: string, id: string) => {
    if (!workspaceId) return;

    set((state) => {
      const currentLayouts = state.layoutsByWorkspace[workspaceId] || [];
      const updated = currentLayouts.map((item) => {
        if (item.i === id) {
          return {
            ...item,
            visible: !item.visible
          };
        }
        return item;
      });

      try {
        localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save widget layout", e);
      }

      return {
        layoutsByWorkspace: {
          ...state.layoutsByWorkspace,
          [workspaceId]: updated
        }
      };
    });
  },

  resetLayout: (workspaceId: string) => {
    if (!workspaceId) return;

    const resetLayout = DEFAULT_LAYOUT.map((item) => ({ ...item }));

    try {
      localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(resetLayout));
    } catch (e) {
      console.error("Failed to save widget layout", e);
    }

    set((state) => ({
      layoutsByWorkspace: {
        ...state.layoutsByWorkspace,
        [workspaceId]: resetLayout
      }
    }));
  }
}));
