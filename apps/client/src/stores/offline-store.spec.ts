import { describe, expect, it, beforeEach, vi } from "vitest";
import { offlineDeletionsKey, offlineLogsKey } from "./offline-queue-storage";
import { useOfflineStore } from "./offline-store";
import { useSessionStore } from "@/stores/session.store";

vi.mock("@/lib/api", () => ({
  api: vi.fn()
}));

const scope = {
  authScope: "app",
  userId: "user-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1"
};

describe("offline-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({
      session: {
        user: { id: "user-1", name: "Member" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "MEMBER"
      },
      accessToken: "token"
    });
    useOfflineStore.getState().clearQueue();
    useOfflineStore.getState().hydrateForSession();
    useOfflineStore.getState().setOffline(false);
  });

  it("should initialize with default states", () => {
    const state = useOfflineStore.getState();
    expect(state.isOffline).toBe(false);
    expect(state.offlineLogs).toEqual([]);
    expect(state.offlineDeletions).toEqual([]);
  });

  it("should add, update, and remove scoped offline logs", () => {
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

    const rawStored = localStorage.getItem(offlineLogsKey(scope));
    expect(rawStored).toContain("Working offline");

    useOfflineStore.getState().updateOfflineLog(addedLog.tempId, {
      description: "Updated description"
    });
    expect(useOfflineStore.getState().offlineLogs[0]!.description).toBe("Updated description");

    useOfflineStore.getState().removeOfflineLog(addedLog.tempId);
    expect(useOfflineStore.getState().offlineLogs).toEqual([]);
  });

  it("should queue scoped server log deletions", () => {
    useOfflineStore.getState().deleteServerLogOffline("server-log-789");
    const store = useOfflineStore.getState();
    expect(store.offlineDeletions).toEqual(["server-log-789"]);

    const rawStored = localStorage.getItem(offlineDeletionsKey(scope));
    expect(rawStored).toBe(JSON.stringify(["server-log-789"]));
  });
});
