import { describe, expect, it, vi, beforeEach } from "vitest";
import { TenantWorkspaceAdminsOverviewService } from "./tenant-workspace-admins-overview.service";

describe("TenantWorkspaceAdminsOverviewService", () => {
  let service: TenantWorkspaceAdminsOverviewService;
  let mockPrisma: any;
  let mockAggregation: any;
  let mockPresence: any;

  const tenantId = "tenant-1";

  beforeEach(() => {
    const adminMembers = [
      {
        id: "wm-1",
        workspaceId: "ws-1",
        userId: "u1",
        role: "ADMIN",
        isActive: true,
        user: { name: "Alex Admin", email: "alex@kloqra.dev", mustChangePassword: false },
        workspace: { id: "ws-1", name: "Acme Corporation", settings: {} }
      },
      {
        id: "wm-2",
        workspaceId: "ws-2",
        userId: "u2",
        role: "ADMIN",
        isActive: true,
        user: { name: "Blake Admin", email: "blake@kloqra.dev", mustChangePassword: true },
        workspace: { id: "ws-2", name: "Beta Workspace", settings: {} }
      }
    ];

    mockPrisma = {
      workspaceMember: {
        findMany: vi.fn().mockResolvedValue(adminMembers)
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
          durationSec: 3600,
          isBillable: true,
          user: { name: "Alex Admin", email: "alex@kloqra.dev", defaultHourlyRate: null },
          task: {
            projectId: "p1",
            categoryId: "c1",
            category: null,
            project: { name: "Project" }
          }
        }
      ]),
      buildAggregates: vi.fn().mockReturnValue({
        byUser: new Map([["u1", { totalHours: 1 }]])
      })
    };

    mockPresence = {
      snapshot: vi.fn().mockResolvedValue({
        members: [{ userId: "u1", isPaused: false }]
      })
    };

    service = new TenantWorkspaceAdminsOverviewService(mockPrisma, mockAggregation, mockPresence);
  });

  it("returns workspace admin rows with summary", async () => {
    const result = await service.getOverview(tenantId, { page: 1, limit: 25 });

    expect(result.admins).toHaveLength(2);
    expect(result.admins[0]?.workspaceName).toBe("Acme Corporation");
    expect(result.admins[0]?.isTrackingNow).toBe(true);
    expect(result.summary.totalAdmins).toBe(2);
    expect(result.summary.workspacesWithAdmins).toBe(2);
  });

  it("filters by workspaceId", async () => {
    mockPrisma.workspaceMember.findMany.mockImplementation(({ where }: { where: any }) => {
      const workspaceIds = where.workspaceId?.in ?? [];
      const rows = [
        {
          id: "wm-1",
          workspaceId: "ws-1",
          userId: "u1",
          role: "ADMIN",
          isActive: true,
          user: { name: "Alex Admin", email: "alex@kloqra.dev", mustChangePassword: false },
          workspace: { id: "ws-1", name: "Acme Corporation", settings: {} }
        }
      ];
      return Promise.resolve(workspaceIds.includes("ws-1") ? rows : []);
    });

    const result = await service.getOverview(tenantId, {
      page: 1,
      limit: 25,
      workspaceIds: ["ws-1"]
    });

    expect(result.admins).toHaveLength(1);
  });
});
