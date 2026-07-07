import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotificationsDispatchService } from "./notifications-dispatch.service";

describe("NotificationsDispatchService", () => {
  let service: NotificationsDispatchService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    workspaceMember: { findMany: ReturnType<typeof vi.fn> };
    tenantMember: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockNotifications: { createInApp: ReturnType<typeof vi.fn> };
  let mockMailer: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn() },
      workspaceMember: { findMany: vi.fn() },
      tenantMember: { findMany: vi.fn() }
    };
    mockNotifications = { createInApp: vi.fn().mockResolvedValue(undefined) };
    mockMailer = { send: vi.fn().mockResolvedValue(undefined) };
    service = new NotificationsDispatchService(
      mockPrisma as never,
      mockNotifications as never,
      mockMailer as never
    );
  });

  it("notifyWorkspaceAdmins delivers to every admin without excluding the actor", async () => {
    mockPrisma.workspaceMember.findMany.mockResolvedValue([
      {
        userId: "admin-1",
        user: { id: "admin-1", email: "admin@kloqra.dev", preferences: {} }
      },
      {
        userId: "admin-2",
        user: { id: "admin-2", email: "owner@kloqra.dev", preferences: {} }
      }
    ]);

    await service.notifyWorkspaceAdmins("ws-1", {
      templateId: "member.removed",
      context: {
        memberName: "Member User",
        workspaceName: "Kloqra",
        actorName: "Admin User"
      }
    });

    expect(mockPrisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws-1", role: "ADMIN" },
      include: { user: { select: { id: true, email: true, preferences: true } } }
    });
    expect(mockNotifications.createInApp).toHaveBeenCalledTimes(2);
  });

  it("notifyTenantOperators delivers workspace created alerts to organization operators", async () => {
    mockPrisma.tenantMember.findMany.mockResolvedValue([
      {
        userId: "owner-1",
        user: { id: "owner-1", email: "owner@kloqra.dev", preferences: {} }
      },
      {
        userId: "admin-1",
        user: { id: "admin-1", email: "admin@kloqra.dev", preferences: {} }
      }
    ]);

    await service.notifyTenantOperators("tenant-1", "ws-new", {
      templateId: "workspace.created",
      context: {
        workspaceName: "Design Agency",
        creatorName: "Kloqra Owner",
        organizationName: "Kloqra Test"
      },
      excludeUserId: "creator-1"
    });

    expect(mockPrisma.tenantMember.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        isActive: true,
        role: { in: ["OWNER", "ADMIN"] },
        userId: { not: "creator-1" }
      },
      include: { user: { select: { id: true, email: true, preferences: true } } }
    });
    expect(mockNotifications.createInApp).toHaveBeenCalledTimes(2);
    expect(mockMailer.send).toHaveBeenCalledTimes(2);
    expect(mockNotifications.createInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "WORKSPACE_CREATED",
        title: "Workspace created"
      })
    );
  });
});
