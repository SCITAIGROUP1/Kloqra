import { describe, expect, it, beforeEach, vi } from "vitest";
import { useOfflineStore } from "./offline-store";

vi.mock("@/lib/api", () => ({
  api: vi.fn()
}));

describe("offline-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useOfflineStore.getState().clearQueue();
    useOfflineStore.getState().setOffline(false);
  });

  it("should initialize with default states", () => {
    const state = useOfflineStore.getState();
    expect(state.isOffline).toBe(false);
    expect(state.offlineLogs).toEqual([]);
    expect(state.offlineDeletions).toEqual([]);
  });

  it("should change offline state", () => {
    useOfflineStore.getState().setOffline(true);
    expect(useOfflineStore.getState().isOffline).toBe(true);

    useOfflineStore.getState().setOffline(false);
    expect(useOfflineStore.getState().isOffline).toBe(false);
  });

  it("should add, update, and remove offline logs", () => {
    const logData = {
      taskId: "task-123",
      projectId: "project-456",
      startTime: "2026-07-05T12:00:00Z",
      endTime: "2026-07-05T13:00:00Z",
      description: "Working offline",
      isBillable: true
    };

    useOfflineStore.getState().addOfflineLog(logData);

    const store = useOfflineStore.getState();
    expect(store.offlineLogs.length).toBe(1);
    const addedLog = store.offlineLogs[0]!;
    expect(addedLog.taskId).toBe("task-123");
    expect(addedLog.syncStatus).toBe("pending");
    expect(addedLog.tempId).toContain("temp-");

    // Check localStorage persistence
    const rawStored = localStorage.getItem("kloqra_offline_logs");
    expect(rawStored).toContain("Working offline");

    // Update the log
    useOfflineStore.getState().updateOfflineLog(addedLog.tempId, {
      description: "Updated description"
    });
    expect(useOfflineStore.getState().offlineLogs[0]!.description).toBe("Updated description");

    // Remove the log
    useOfflineStore.getState().removeOfflineLog(addedLog.tempId);
    expect(useOfflineStore.getState().offlineLogs).toEqual([]);
  });

  it("should queue server log deletions", () => {
    useOfflineStore.getState().deleteServerLogOffline("server-log-789");
    const store = useOfflineStore.getState();
    expect(store.offlineDeletions).toEqual(["server-log-789"]);

    const rawStored = localStorage.getItem("kloqra_offline_deletions");
    expect(rawStored).toBe(JSON.stringify(["server-log-789"]));
  });
});
