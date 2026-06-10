import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceMembersOverviewService } from "./workspace-members-overview.service";

describe("WorkspaceMembersOverviewService", () => {
  let service: WorkspaceMembersOverviewService;
  let mockPrisma: any;
  let mockAggregation: any;
  let mockPresence: any;

  const workspaceId = "ws-1";

  beforeEach(() => {
    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: workspaceId,
          settings: { weekStart: "monday" }
        })
      },
      workspaceMember: {
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(2).mockResolvedValueOnce(1),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: "m1",
              workspaceId,
              userId: "u1",
              role: "ADMIN",
              createdAt: new Date("2025-01-01T00:00:00.000Z"),
              user: { name: "Admin User", email: "admin@kloqra.dev" }
            },
            {
              id: "m2",
              workspaceId,
              userId: "u2",
              role: "MEMBER",
              createdAt: new Date("2025-02-01T00:00:00.000Z"),
              user: { name: "Member User", email: "member@kloqra.dev" }
            }
          ])
          .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }])
      },
      teamMember: {
        groupBy: vi.fn().mockResolvedValue([
          { userId: "u1", _count: { _all: 2 } },
          { userId: "u2", _count: { _all: 1 } }
        ])
      },
      timeLog: {
        groupBy: vi.fn().mockResolvedValue([
          { userId: "u1", _max: { startTime: new Date() } },
          { userId: "u2", _max: { startTime: new Date("2020-01-01T00:00:00.000Z") } }
        ])
      }
    };

    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([
        {
          userId: "u1",
          durationSec: 7200,
          isBillable: true,
          user: { name: "Admin User", email: "admin@kloqra.dev", defaultHourlyRate: null },
          task: {
            projectId: "p1",
            categoryId: "c1",
            category: null,
            project: { name: "Project A", clientName: null }
          }
        }
      ]),
      buildAggregates: vi.fn().mockReturnValue({
        byUser: new Map([
          [
            "u1",
            {
              userName: "Admin User",
              userEmail: "admin@kloqra.dev",
              totalHours: 2,
              billableHours: 2,
              billableAmount: 0
            }
          ]
        ])
      })
    };

    mockPresence = {
      snapshot: vi.fn().mockResolvedValue({
        members: [{ userId: "u2", isPaused: false }],
        updatedAt: new Date().toISOString()
      })
    };

    service = new WorkspaceMembersOverviewService(mockPrisma, mockAggregation, mockPresence);
  });

  it("returns enriched member overview with summary stats", async () => {
    const result = await service.getOverview(workspaceId, { page: 1, limit: 20 });

    expect(result.summary).toEqual({
      totalMembers: 2,
      activeMembers: 2,
      adminCount: 1,
      totalWeekHours: 2
    });

    expect(result.members).toHaveLength(2);

    const admin = result.members.find((m) => m.userId === "u1");
    expect(admin).toMatchObject({
      role: "ADMIN",
      status: "active",
      projectCount: 2,
      weekHours: 2,
      isTrackingNow: false
    });

    const member = result.members.find((m) => m.userId === "u2");
    expect(member).toMatchObject({
      role: "MEMBER",
      status: "active",
      projectCount: 1,
      weekHours: 0,
      isTrackingNow: true
    });
  });
});
