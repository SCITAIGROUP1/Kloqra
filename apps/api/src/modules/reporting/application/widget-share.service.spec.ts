import { describe, it, expect, vi, beforeEach } from "vitest";
import { WidgetShareService } from "./widget-share.service";

describe("WidgetShareService", () => {
  let service: WidgetShareService;
  let mockPrisma: {
    widgetShare: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let mockReporting: {
    dashboard: ReturnType<typeof vi.fn>;
    utilization: ReturnType<typeof vi.fn>;
  };

  const workspaceId = "ws-1";
  const mockReport = {
    period: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-31T23:59:59.000Z" },
    workspace: {
      totalHours: 40,
      billableHours: 32,
      nonBillableHours: 8,
      totalAmount: 3200,
      currency: "USD",
      activeProjects: 2,
      activeMembers: 3,
      billablePercent: 80
    },
    timeByProject: [],
    timeByUser: [],
    timeByCategory: [],
    weeklyHours: [],
    dailyHours: [],
    dailyByProject: []
  };

  beforeEach(() => {
    mockPrisma = {
      widgetShare: {
        create: vi.fn().mockResolvedValue({
          id: "share-1",
          token: "a".repeat(48),
          expiresAt: new Date("2025-07-01T00:00:00.000Z")
        }),
        findUnique: vi.fn()
      }
    };
    mockReporting = {
      dashboard: vi.fn().mockResolvedValue(mockReport),
      utilization: vi.fn().mockResolvedValue({
        period: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-31T23:59:59.000Z" },
        expectedWeeklyHours: 40,
        targetHours: 160,
        members: [],
        page: 1,
        limit: 1000,
        total: 0,
        totalPages: 0
      })
    };
    service = new WidgetShareService(mockPrisma as never, mockReporting as never);
  });

  it("creates a widget share with admin URL", async () => {
    const result = await service.create(
      workspaceId,
      {
        body: {
          widgetId: "distribution_donut",
          from: "2025-01-01T00:00:00.000Z",
          to: "2025-01-31T23:59:59.000Z",
          options: { groupBy: "project" }
        },
        expiresInDays: 30
      },
      "http://localhost:3002"
    );

    expect(mockPrisma.widgetShare.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId,
          body: expect.objectContaining({ widgetId: "distribution_donut" })
        })
      })
    );
    expect(result.shareUrl).toBe(`http://localhost:3002/widget/${"a".repeat(48)}`);
    expect(result.token).toHaveLength(48);
  });

  it("returns public view with dashboard payload for valid token", async () => {
    mockPrisma.widgetShare.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86400000),
      workspace: { name: "Acme Corp" },
      body: {
        widgetId: "distribution_donut",
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-31T23:59:59.000Z",
        options: { groupBy: "user" }
      }
    });

    const view = await service.getPublicView("valid-token");

    expect(mockReporting.dashboard).toHaveBeenCalled();
    expect(view.workspaceName).toBe("Acme Corp");
    expect(view.widgetId).toBe("distribution_donut");
    expect(view.widgetLabel).toBe("Distribution Donut");
    expect(view.payload).toEqual(mockReport);
    expect(view.options).toEqual({ groupBy: "user" });
  });

  it("returns utilization payload for team utilization shares", async () => {
    mockPrisma.widgetShare.findUnique.mockResolvedValue({
      workspaceId,
      expiresAt: new Date(Date.now() + 86400000),
      workspace: { name: "Acme Corp" },
      body: {
        widgetId: "team_utilization",
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-31T23:59:59.000Z",
        projectId: "550e8400-e29b-41d4-a716-446655440000"
      }
    });

    const view = await service.getPublicView("util-token");

    expect(mockReporting.utilization).toHaveBeenCalledWith(
      workspaceId,
      expect.objectContaining({
        projectId: ["550e8400-e29b-41d4-a716-446655440000"],
        page: 1,
        limit: 1000
      })
    );
    expect(mockReporting.dashboard).not.toHaveBeenCalled();
    expect(view.widgetId).toBe("team_utilization");
    expect(view.widgetLabel).toBe("Team Utilization");
    expect(view.payload).toMatchObject({ targetHours: 160 });
  });

  it("throws NOT_FOUND for expired share token", async () => {
    mockPrisma.widgetShare.findUnique.mockResolvedValue({
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      workspace: { name: "Acme" },
      body: {
        widgetId: "distribution_donut",
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-31T23:59:59.000Z"
      }
    });

    await expect(service.getPublicView("expired")).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });

  it("throws NOT_FOUND for missing share token", async () => {
    mockPrisma.widgetShare.findUnique.mockResolvedValue(null);

    await expect(service.getPublicView("missing")).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });
});
