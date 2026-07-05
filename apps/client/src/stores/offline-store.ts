import { ROUTES } from "@kloqra/contracts";
import { toast } from "sonner";
import { create } from "zustand";
import { api } from "@/lib/api";

export interface OfflineLog {
  tempId: string;
  taskId: string;
  projectId?: string;
  startTime: string;
  endTime: string;
  description?: string;
  isBillable?: boolean;
  syncStatus: "pending" | "syncing" | "failed";
}

interface OfflineState {
  isOffline: boolean;
  offlineLogs: OfflineLog[];
  offlineDeletions: string[]; // Server log IDs to delete on reconnect
  setOffline: (isOffline: boolean) => void;
  addOfflineLog: (log: Omit<OfflineLog, "tempId" | "syncStatus">) => void;
  removeOfflineLog: (tempId: string) => void;
  deleteServerLogOffline: (id: string) => void;
  updateOfflineLog: (
    tempId: string,
    updates: Partial<Omit<OfflineLog, "tempId" | "syncStatus">>
  ) => void;
  clearQueue: () => void;
  syncQueue: (workspaceId: string) => Promise<void>;
}

const LOCAL_STORAGE_LOGS_KEY = "kloqra_offline_logs";
const LOCAL_STORAGE_DELETIONS_KEY = "kloqra_offline_deletions";

function getStoredLogs(): OfflineLog[] {
  if (typeof window === "undefined") return [];
  try {
    const val = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

function getStoredDeletions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const val = localStorage.getItem(LOCAL_STORAGE_DELETIONS_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  offlineLogs: getStoredLogs(),
  offlineDeletions: getStoredDeletions(),

  setOffline: (isOffline) => set({ isOffline }),

  addOfflineLog: (log) => {
    const newLog: OfflineLog = {
      ...log,
      tempId: `temp-${crypto.randomUUID()}`,
      syncStatus: "pending"
    };
    const updated = [...get().offlineLogs, newLog];
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    set({ offlineLogs: updated });
    toast.info("Offline: Entry saved locally");
  },

  removeOfflineLog: (tempId) => {
    const updated = get().offlineLogs.filter((x) => x.tempId !== tempId);
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    set({ offlineLogs: updated });
  },

  deleteServerLogOffline: (id) => {
    const updated = [...get().offlineDeletions, id];
    localStorage.setItem(LOCAL_STORAGE_DELETIONS_KEY, JSON.stringify(updated));
    set({ offlineDeletions: updated });
    toast.info("Offline: Deletion queued locally");
  },

  updateOfflineLog: (tempId, updates) => {
    const updated = get().offlineLogs.map((x) => (x.tempId === tempId ? { ...x, ...updates } : x));
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    set({ offlineLogs: updated });
    toast.info("Offline: Entry updated locally");
  },

  clearQueue: () => {
    localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DELETIONS_KEY);
    set({ offlineLogs: [], offlineDeletions: [] });
  },

  syncQueue: async (workspaceId) => {
    const { offlineLogs, offlineDeletions } = get();
    if (offlineLogs.length === 0 && offlineDeletions.length === 0) return;

    toast.loading("Syncing offline changes...", { id: "offline-sync" });

    let successCount = 0;
    let failCount = 0;

    // 1. Process deletions
    const remainingDeletions: string[] = [];
    for (const id of offlineDeletions) {
      try {
        await api(ROUTES.TIMELOGS.BY_ID(id), {
          method: "DELETE",
          workspaceId
        });
        successCount++;
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          successCount++;
        } else {
          remainingDeletions.push(id);
          failCount++;
        }
      }
    }
    localStorage.setItem(LOCAL_STORAGE_DELETIONS_KEY, JSON.stringify(remainingDeletions));
    set({ offlineDeletions: remainingDeletions });

    // 2. Process creations
    const remainingLogs: OfflineLog[] = [];
    for (const log of offlineLogs) {
      try {
        // Mark as syncing
        set((state) => ({
          offlineLogs: state.offlineLogs.map((x) =>
            x.tempId === log.tempId ? { ...x, syncStatus: "syncing" } : x
          )
        }));

        await api(ROUTES.TIMELOGS.CREATE, {
          method: "POST",
          workspaceId,
          body: JSON.stringify({
            taskId: log.taskId,
            startTime: log.startTime,
            endTime: log.endTime,
            description: log.description,
            isBillable: log.isBillable
          })
        });

        successCount++;
      } catch {
        remainingLogs.push({ ...log, syncStatus: "failed" });
        failCount++;
      }
    }
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(remainingLogs));
    set({ offlineLogs: remainingLogs });

    if (failCount === 0) {
      toast.success(`Successfully synced ${successCount} offline changes!`, {
        id: "offline-sync"
      });
    } else {
      toast.warning(`Synced ${successCount} items, ${failCount} items failed to sync.`, {
        id: "offline-sync"
      });
    }
  }
}));
