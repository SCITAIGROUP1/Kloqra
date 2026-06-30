import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceTeamActivitiesService } from "./workspace-team-activities.service";

describe("WorkspaceTeamActivitiesService", () => {
  const workspaceId = "ws-1";
  const userA = "user-a";
  const userB = "user-b";

  let service: WorkspaceTeamActivitiesService;
  let mockPrisma: {
    workspace: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    workspaceMember: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockAggregation: { fetchLogs: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: workspaceId,
          settings: { weekStart: "monday" }
        })
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([
          { userId: userA, user: { name: "Alice" } },
          { userId: userB, user: { name: "Bob" } }
        ])
      }
    };

    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([
        {
          userId: userA,
          durationSec: 3600,
          description: "Review",
          startTime: new Date("2025-06-09T09:00:00.000Z"),
          endTime: new Date("2025-06-09T10:00:00.000Z"),
          task: {
            taskName: "Code review",
            projectId: "proj-1",
            project: { name: "Annual Audit" }
          }
        },
        {
          userId: userA,
          durationSec: 3600,
          startTime: new Date("2025-06-10T09:00:00.000Z"),
          endTime: new Date("2025-06-10T12:00:00.000Z"),
          description: "Review",
          task: {
            taskName: "Code review",
            projectId: "proj-1",
            project: { name: "Annual Audit" }
          }
        }
      ])
    };

    service = new WorkspaceTeamActivitiesService(mockPrisma as never, mockAggregation as never);
  });

  it("returns member rows with latest activity, period totals, and daily hours", async () => {
    const result = await service.getTeamActivities(workspaceId, {
      from: "2025-06-09T00:00:00.000Z",
      to: "2025-06-15T23:59:59.999Z",
      projectId: "proj-1"
    });

    expect(mockAggregation.fetchLogs).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({
        projectId: "proj-1"
      })
    );

    expect(result.members).toHaveLength(2);
    expect(result.members[0]?.userName).toBe("Alice");
    expect(result.members[0]?.periodTotalHours).toBe(2);
    expect(result.members[0]?.latestActivity?.taskName).toBe("Code review");
    expect(result.members[0]?.latestActivity?.durationSec).toBe(3600);
    expect(result.members[0]?.dailyHours.length).toBeGreaterThan(0);

    const bob = result.members.find((m) => m.userId === userB);
    expect(bob?.latestActivity).toBeNull();
    expect(bob?.periodTotalHours).toBe(0);
  });
});
