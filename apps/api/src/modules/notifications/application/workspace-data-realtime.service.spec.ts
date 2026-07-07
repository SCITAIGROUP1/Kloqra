import { describe, expect, it, vi } from "vitest";
import { WorkspaceDataRealtimeService } from "./workspace-data-realtime.service";

describe("WorkspaceDataRealtimeService", () => {
  it("publishes workspace.data.stale on the user channel", async () => {
    const publish = vi.fn().mockResolvedValue(1);
    const service = new WorkspaceDataRealtimeService({
      getClient: () => ({ publish })
    } as never);

    await service.publishStale("user-1", {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      scopes: ["timelogs", "timesheet"]
    });

    expect(publish).toHaveBeenCalledWith(
      "workspace-data:user:user-1",
      JSON.stringify({
        workspaceId: "22222222-2222-4222-8222-222222222222",
        scopes: ["timelogs", "timesheet"]
      })
    );
  });

  it("dedupes user ids when publishing to multiple recipients", async () => {
    const publish = vi.fn().mockResolvedValue(1);
    const service = new WorkspaceDataRealtimeService({
      getClient: () => ({ publish })
    } as never);

    await service.publishStaleToUsers(["user-1", "user-1", "user-2"], {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      scopes: ["timelogs"]
    });

    expect(publish).toHaveBeenCalledTimes(2);
  });
});
