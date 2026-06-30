import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotificationsDispatchService } from "./notifications-dispatch.service";

describe("NotificationsDispatchService", () => {
  let service: NotificationsDispatchService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    workspaceMember: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockNotifications: { createInApp: ReturnType<typeof vi.fn> };
  let mockMailer: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn() },
      workspaceMember: { findMany: vi.fn() }
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
});
