import { describe, expect, it } from "vitest";
import { listProjectTeamQuerySchema, teamMemberSchema, updateTeamMemberSchema } from "./team.dto";

const MEMBER_ID = "00000000-0000-4000-8000-000000000001";
const TEAM_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000003";

describe("teamMemberSchema", () => {
  it("accepts PROJECT_MANAGER and MEMBER roles", () => {
    for (const role of ["PROJECT_MANAGER", "MEMBER"] as const) {
      const result = teamMemberSchema.safeParse({
        id: MEMBER_ID,
        teamId: TEAM_ID,
        userId: USER_ID,
        userName: "Alex PM",
        userEmail: "alex@example.com",
        role,
        isActive: true
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateTeamMemberSchema", () => {
  it("accepts role update", () => {
    const result = updateTeamMemberSchema.safeParse({ role: "PROJECT_MANAGER" });
    expect(result.success).toBe(true);
  });

  it("requires at least one field", () => {
    expect(updateTeamMemberSchema.safeParse({}).success).toBe(false);
  });
});

describe("listProjectTeamQuerySchema", () => {
  it("parses without role — role is undefined", () => {
    const result = listProjectTeamQuerySchema.safeParse({ page: "1", limit: "25" });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBeUndefined();
  });

  it("accepts PROJECT_MANAGER as role filter", () => {
    const result = listProjectTeamQuerySchema.safeParse({
      page: "1",
      limit: "25",
      role: "PROJECT_MANAGER"
    });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBe("PROJECT_MANAGER");
  });

  it("accepts MEMBER as role filter", () => {
    const result = listProjectTeamQuerySchema.safeParse({
      page: "1",
      limit: "25",
      role: "MEMBER"
    });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBe("MEMBER");
  });

  it("rejects invalid role values", () => {
    const result = listProjectTeamQuerySchema.safeParse({
      page: "1",
      limit: "25",
      role: "ADMIN"
    });
    expect(result.success).toBe(false);
  });
});
