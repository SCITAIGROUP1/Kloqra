import { describe, expect, it } from "vitest";
import {
  workspaceAdminOverviewSchema,
  workspaceAdminsOverviewQuerySchema,
  workspaceAdminsOverviewSchema
} from "./workspace-admin.dto";

describe("workspaceAdminsOverviewQuerySchema", () => {
  it("parses optional filters", () => {
    const parsed = workspaceAdminsOverviewQuerySchema.parse({
      page: "1",
      limit: "25",
      search: "alex",
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      status: "active",
      membershipActive: "true"
    });
    expect(parsed.membershipActive).toBe(true);
    expect(parsed.status).toBe("active");
  });
});

describe("workspaceAdminsOverviewSchema", () => {
  it("validates overview shape", () => {
    const result = workspaceAdminsOverviewSchema.safeParse({
      admins: [
        {
          workspaceMemberId: "550e8400-e29b-41d4-a716-446655440001",
          userId: "550e8400-e29b-41d4-a716-446655440002",
          userName: "Alex Admin",
          userEmail: "alex@kloqra.dev",
          workspaceId: "550e8400-e29b-41d4-a716-446655440003",
          workspaceName: "Acme Corporation",
          isActive: true,
          status: "active",
          weekHours: 8,
          lastActiveAt: "2026-06-24T10:00:00.000Z",
          isTrackingNow: false
        }
      ],
      summary: {
        totalAdmins: 1,
        activeAdmins: 1,
        workspacesWithAdmins: 1
      },
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(workspaceAdminOverviewSchema.safeParse(result.data.admins[0]).success).toBe(true);
    }
  });
});
