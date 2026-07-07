import { ROUTES } from "@kloqra/contracts";
import { invalidateTimelogData } from "@kloqra/web-shared";
import { toast } from "sonner";
import { create } from "zustand";
import {
  clearLegacyOfflineQueue,
  clearOfflineQueueStorage,
  readOfflineDeletions,
  readOfflineLogs,
  resolveOfflineQueueScope,
  writeOfflineDeletions,
  writeOfflineLogs,
  type OfflineQueueScope
} from "./offline-queue-storage";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session.store";

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
  activeScope: OfflineQueueScope | null;
  offlineLogs: OfflineLog[];
  offlineDeletions: string[];
  setOffline: (isOffline: boolean) => void;
  hydrateForSession: () => void;
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

function loadScopedQueue(scope: OfflineQueueScope | null): {
  offlineLogs: OfflineLog[];
  offlineDeletions: string[];
} {
  if (!scope) {
    return { offlineLogs: [], offlineDeletions: [] };
  }
  return {
    offlineLogs: readOfflineLogs(scope),
    offlineDeletions: readOfflineDeletions(scope)
  };
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  activeScope: null,
  offlineLogs: [],
  offlineDeletions: [],

  setOffline: (isOffline) => set({ isOffline }),

  hydrateForSession: () => {
    clearLegacyOfflineQueue();
    const scope = resolveOfflineQueueScope(useSessionStore.getState().session);
    const loaded = loadScopedQueue(scope);
    set({ activeScope: scope, ...loaded });
  },

  addOfflineLog: (log) => {
    const scope = get().activeScope ?? resolveOfflineQueueScope(useSessionStore.getState().session);
    if (!scope?.workspaceId) {
      toast.error("Select a workspace before saving offline entries.");
      return;
    }
    const newLog: OfflineLog = {
      ...log,
      tempId: `temp-${crypto.randomUUID()}`,
      syncStatus: "pending"
    };
    const updated = [...get().offlineLogs, newLog];
    writeOfflineLogs(scope, updated);
    set({ activeScope: scope, offlineLogs: updated });
    toast.info("Offline: Entry saved locally");
  },

  removeOfflineLog: (tempId) => {
    const scope = get().activeScope;
    if (!scope) return;
    const updated = get().offlineLogs.filter((x) => x.tempId !== tempId);
    writeOfflineLogs(scope, updated);
    set({ offlineLogs: updated });
  },

  deleteServerLogOffline: (id) => {
    const scope = get().activeScope;
    if (!scope) return;
    const updated = [...get().offlineDeletions, id];
    writeOfflineDeletions(scope, updated);
    set({ offlineDeletions: updated });
    toast.info("Offline: Deletion queued locally");
  },

  updateOfflineLog: (tempId, updates) => {
    const scope = get().activeScope;
    if (!scope) return;
    const updated = get().offlineLogs.map((x) => (x.tempId === tempId ? { ...x, ...updates } : x));
    writeOfflineLogs(scope, updated);
    set({ offlineLogs: updated });
    toast.info("Offline: Entry updated locally");
  },

  clearQueue: () => {
    const scope = get().activeScope;
    clearOfflineQueueStorage(scope);
    clearLegacyOfflineQueue();
    set({ offlineLogs: [], offlineDeletions: [], activeScope: null });
  },

  syncQueue: async (workspaceId) => {
    const scope = get().activeScope ?? resolveOfflineQueueScope(useSessionStore.getState().session);
    if (!scope || scope.workspaceId !== workspaceId) return;

    const { offlineLogs, offlineDeletions } = get();
    if (offlineLogs.length === 0 && offlineDeletions.length === 0) return;

    toast.loading("Syncing offline changes...", { id: "offline-sync" });

    let successCount = 0;
    let failCount = 0;

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
    writeOfflineDeletions(scope, remainingDeletions);
    set({ offlineDeletions: remainingDeletions });

    const remainingLogs: OfflineLog[] = [];
    for (const log of offlineLogs) {
      try {
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
    writeOfflineLogs(scope, remainingLogs);
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

    if (successCount > 0) {
      invalidateTimelogData(workspaceId);
    }
  }
}));
