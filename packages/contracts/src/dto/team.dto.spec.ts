import { describe, expect, it } from "vitest";
import { teamMemberSchema, updateTeamMemberSchema } from "./team.dto";

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
