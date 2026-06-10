import { create } from "zustand";
import { DEFAULT_LAYOUT, WIDGET_REGISTRY, type WidgetLayoutItem } from "./widget-registry";

interface WidgetLayoutState {
  layoutsByWorkspace: Record<string, WidgetLayoutItem[]>;
  initialized: boolean;

  initialize: (workspaceId: string) => void;
  updateLayout: (workspaceId: string, rglLayout: any[], options?: { persist?: boolean }) => void;
  persistLayout: (workspaceId: string) => void;
  saveLayoutAsDefault: (workspaceId: string) => void;
  toggleWidget: (workspaceId: string, id: string) => void;
  resetLayout: (workspaceId: string) => void;
}

const getStorageKey = (workspaceId: string) => `kloqra-member-layout-v3-${workspaceId}`;
const getDefaultStorageKey = (workspaceId: string) =>
  `kloqra-member-layout-v3-default-${workspaceId}`;

function mergeLayoutsWithRegistry(savedLayouts: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const finalLayouts: WidgetLayoutItem[] = [];

  for (const registryWidget of WIDGET_REGISTRY) {
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
      const defaultItem = DEFAULT_LAYOUT.find((item) => item.i === registryWidget.id);
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

function readStoredLayouts(workspaceId: string): WidgetLayoutItem[] {
  try {
    const stored =
      localStorage.getItem(getStorageKey(workspaceId)) ??
      localStorage.getItem(getDefaultStorageKey(workspaceId));
    if (stored) {
      return JSON.parse(stored) as WidgetLayoutItem[];
    }
  } catch (e) {
    console.error("Failed to parse saved widget layout", e);
  }
  return [];
}

function writeLayout(storageKey: string, layout: WidgetLayoutItem[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch (e) {
    console.error("Failed to save widget layout", e);
  }
}

export const useWidgetLayout = create<WidgetLayoutState>((set, get) => ({
  layoutsByWorkspace: {},
  initialized: false,

  initialize: (workspaceId: string) => {
    if (!workspaceId) return;

    const finalLayouts = mergeLayoutsWithRegistry(readStoredLayouts(workspaceId));

    set((state) => ({
      layoutsByWorkspace: {
        ...state.layoutsByWorkspace,
        [workspaceId]: finalLayouts
      },
      initialized: true
    }));
  },

  updateLayout: (workspaceId: string, rglLayout: any[], options?: { persist?: boolean }) => {
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

      if (options?.persist !== false) {
        writeLayout(getStorageKey(workspaceId), updated);
      }

      return {
        layoutsByWorkspace: {
          ...state.layoutsByWorkspace,
          [workspaceId]: updated
        }
      };
    });
  },

  persistLayout: (workspaceId: string) => {
    if (!workspaceId) return;
    const layout = get().layoutsByWorkspace[workspaceId];
    if (layout) {
      writeLayout(getStorageKey(workspaceId), layout);
    }
  },

  saveLayoutAsDefault: (workspaceId: string) => {
    if (!workspaceId) return;
    const layout = get().layoutsByWorkspace[workspaceId];
    if (layout) {
      writeLayout(getDefaultStorageKey(workspaceId), layout);
    }
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

      writeLayout(getStorageKey(workspaceId), updated);

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

    const customDefault = readStoredLayoutsFromKey(getDefaultStorageKey(workspaceId));
    const resetLayoutItems =
      customDefault.length > 0
        ? mergeLayoutsWithRegistry(customDefault)
        : DEFAULT_LAYOUT.map((item) => ({ ...item }));

    writeLayout(getStorageKey(workspaceId), resetLayoutItems);

    set((state) => ({
      layoutsByWorkspace: {
        ...state.layoutsByWorkspace,
        [workspaceId]: resetLayoutItems
      }
    }));
  }
}));

function readStoredLayoutsFromKey(storageKey: string): WidgetLayoutItem[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored) as WidgetLayoutItem[];
    }
  } catch (e) {
    console.error("Failed to parse saved widget layout", e);
  }
  return [];
}
