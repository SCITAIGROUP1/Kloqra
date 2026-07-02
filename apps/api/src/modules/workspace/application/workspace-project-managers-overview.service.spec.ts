import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceProjectManagersOverviewService } from "./workspace-project-managers-overview.service";

describe("WorkspaceProjectManagersOverviewService", () => {
  let service: WorkspaceProjectManagersOverviewService;
  let mockPrisma: any;
  let mockAggregation: any;
  let mockPresence: any;

  const workspaceId = "ws-1";

  beforeEach(() => {
    const leadRows = [
      {
        id: "tm-1",
        userId: "u1",
        isActive: true,
        user: { name: "Casey Nguyen", email: "casey@kloqra.dev" },
        team: {
          project: { id: "p1", name: "Brand Campaign Q2", isActive: true }
        }
      },
      {
        id: "tm-2",
        userId: "u1",
        isActive: true,
        user: { name: "Casey Nguyen", email: "casey@kloqra.dev" },
        team: {
          project: { id: "p2", name: "Website Refresh", isActive: true }
        }
      },
      {
        id: "tm-3",
        userId: "u2",
        isActive: false,
        user: { name: "Drew Martinez", email: "drew@kloqra.dev" },
        team: {
          project: { id: "p1", name: "Brand Campaign Q2", isActive: true }
        }
      }
    ];

    mockPrisma = {
      workspace: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: workspaceId,
          settings: { weekStart: "monday" }
        })
      },
      teamMember: {
        findMany: vi.fn().mockImplementation(({ where }: { where?: { isActive?: boolean } }) => {
          if (where?.isActive === false) {
            return Promise.resolve(leadRows.filter((row) => !row.isActive));
          }
          if (where?.isActive === true) {
            return Promise.resolve(leadRows.filter((row) => row.isActive));
          }
          return Promise.resolve(leadRows);
        })
      },
      timeLog: {
        groupBy: vi.fn().mockResolvedValue([
          { userId: "u1", _max: { startTime: new Date() } },
          { userId: "u2", _max: { startTime: new Date("2020-01-01T00:00:00.000Z") } }
        ])
      },
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "wm-1",
            userId: "u1",
            role: "MEMBER",
            isActive: true,
            user: { id: "u1" }
          },
          {
            id: "wm-2",
            userId: "u2",
            role: "MEMBER",
            isActive: true,
            user: { id: "u2" }
          }
        ])
      }
    };

    mockAggregation = {
      fetchLogs: vi.fn().mockResolvedValue([
        {
          userId: "u1",
          durationSec: 7200,
          isBillable: true,
          user: { name: "Casey Nguyen", email: "casey@kloqra.dev", defaultHourlyRate: null },
          task: {
            projectId: "p1",
            categoryId: "c1",
            category: null,
            project: { name: "Brand Campaign Q2" }
          }
        }
      ]),
      buildAggregates: vi.fn().mockReturnValue({
        byUser: new Map([["u1", { totalHours: 2 }]])
      })
    };

    mockPresence = {
      snapshot: vi.fn().mockResolvedValue({
        members: [{ userId: "u1", isPaused: false }]
      })
    };

    service = new WorkspaceProjectManagersOverviewService(
      mockPrisma,
      mockAggregation,
      mockPresence
    );
  });

  it("groups lead assignments by user and paginates", async () => {
    const result = await service.getOverview(workspaceId, { page: 1, limit: 25 });

    expect(result.managers).toHaveLength(2);
    expect(result.managers[0]?.userName).toBe("Casey Nguyen");
    expect(result.managers[0]?.managedProjectCount).toBe(2);
    expect(result.managers[0]?.isTrackingNow).toBe(true);
    expect(result.summary.totalManagers).toBe(2);
    expect(result.summary.totalLedProjects).toBe(2);
  });

  it("filters by projectId", async () => {
    mockPrisma.teamMember.findMany.mockImplementation(({ where }: { where: any }) => {
      const projectId = where.team?.project?.id;
      const rows = [
        {
          id: "tm-1",
          userId: "u1",
          isActive: true,
          user: { name: "Casey Nguyen", email: "casey@kloqra.dev" },
          team: { project: { id: "p1", name: "Brand Campaign Q2", isActive: true } }
        }
      ];
      return Promise.resolve(projectId === "p1" ? rows : []);
    });

    const result = await service.getOverview(workspaceId, {
      page: 1,
      limit: 25,
      projectId: "p1"
    });

    expect(result.managers).toHaveLength(1);
    expect(result.managers[0]?.managedProjectCount).toBe(1);
  });

  it("filters by assignmentActive", async () => {
    const result = await service.getOverview(workspaceId, {
      page: 1,
      limit: 25,
      assignmentActive: false
    });

    expect(result.managers).toHaveLength(1);
    expect(result.managers[0]?.userName).toBe("Drew Martinez");
  });
});
