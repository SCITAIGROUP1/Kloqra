import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceMembersOverviewService } from "./workspace-members-overview.service";

describe("WorkspaceMembersOverviewService", () => {
  let service: WorkspaceMembersOverviewService;
  let mockPrisma: any;
  let mockAggregation: any;
  let mockPresence: any;

  const workspaceId = "ws-1";

  beforeEach(() => {
    const workspaceMembers = [
      {
        id: "m1",
        workspaceId,
        userId: "u1",
        role: "ADMIN",
        isActive: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        user: { name: "Admin User", email: "admin@kloqra.dev", mustChangePassword: false }
      },
      {
        id: "m2",
        workspaceId,
        userId: "u2",
        role: "MEMBER",
        isActive: true,
        createdAt: new Date("2025-02-01T00:00:00.000Z"),
        user: { name: "Member User", email: "member@kloqra.dev", mustChangePassword: false }
      }
    ];

    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: workspaceId,
          settings: { weekStart: "monday" }
        })
      },
      workspaceMember: {
        count: vi.fn().mockImplementation(({ where }: { where?: { role?: string } }) => {
          if (where?.role === "ADMIN") return Promise.resolve(1);
          return Promise.resolve(2);
        }),
        findMany: vi.fn().mockImplementation(({ select }) => {
          if (select) {
            return Promise.resolve([
              { userId: "u1", isActive: true },
              { userId: "u2", isActive: true }
            ]);
          }
          return Promise.resolve(workspaceMembers);
        })
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
      isActive: true,
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

  it("filters members by activity status", async () => {
    mockPresence.snapshot.mockResolvedValue({
      members: [{ userId: "u2", isPaused: true }],
      updatedAt: new Date().toISOString()
    });

    const result = await service.getOverview(workspaceId, {
      page: 1,
      limit: 20,
      status: "inactive"
    });

    expect(result.members).toHaveLength(1);
    expect(result.members[0]?.userId).toBe("u2");
    expect(result.total).toBe(1);
  });
});
