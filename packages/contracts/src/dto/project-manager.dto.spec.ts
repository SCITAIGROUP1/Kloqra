import { describe, expect, it } from "vitest";
import {
  projectManagerOverviewSchema,
  projectManagersOverviewQuerySchema,
  projectManagersOverviewSchema
} from "./project-manager.dto";

describe("projectManagersOverviewQuerySchema", () => {
  it("parses optional filters", () => {
    const parsed = projectManagersOverviewQuerySchema.parse({
      page: "1",
      limit: "25",
      search: "casey",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      status: "active",
      membershipActive: "true",
      assignmentActive: "false"
    });
    expect(parsed.membershipActive).toBe(true);
    expect(parsed.assignmentActive).toBe(false);
    expect(parsed.status).toBe("active");
  });
});

describe("projectManagersOverviewSchema", () => {
  it("validates overview shape", () => {
    const result = projectManagersOverviewSchema.safeParse({
      managers: [
        {
          workspaceMemberId: "550e8400-e29b-41d4-a716-446655440001",
          userId: "550e8400-e29b-41d4-a716-446655440002",
          userName: "Casey Nguyen",
          userEmail: "casey@kloqra.dev",
          workspaceRole: "MEMBER",
          isWorkspaceMemberActive: true,
          managedProjects: [
            {
              projectId: "550e8400-e29b-41d4-a716-446655440003",
              projectName: "Brand Campaign Q2",
              teamMemberId: "550e8400-e29b-41d4-a716-446655440004",
              isActive: true,
              projectIsActive: true
            }
          ],
          managedProjectCount: 1,
          activeLedProjectCount: 1,
          status: "active",
          weekHours: 12.5,
          lastActiveAt: "2026-06-24T10:00:00.000Z",
          isTrackingNow: false
        }
      ],
      summary: {
        totalManagers: 1,
        activeManagers: 1,
        totalLedProjects: 1
      },
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(projectManagerOverviewSchema.safeParse(result.data.managers[0]).success).toBe(true);
    }
  });
});
