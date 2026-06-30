import { describe, expect, it } from "vitest";
import { toWorkspaceMemberWithUser, isWorkspaceMembershipActive } from "./workspace-member.types";

describe("toWorkspaceMemberWithUser", () => {
  const base = {
    id: "m-1",
    workspaceId: "ws-1",
    userId: "u-1",
    role: "MEMBER",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    user: {
      id: "u-1",
      email: "member@kloqra.dev",
      name: "Member User"
    } as never
  };

  it("defaults isActive to true when missing from Prisma row", () => {
    expect(toWorkspaceMemberWithUser(base).isActive).toBe(true);
  });

  it("preserves explicit isActive", () => {
    expect(toWorkspaceMemberWithUser({ ...base, isActive: false }).isActive).toBe(false);
  });

  it("treats missing isActive as active", () => {
    expect(isWorkspaceMembershipActive({ id: "m-1" })).toBe(true);
    expect(isWorkspaceMembershipActive({ isActive: false })).toBe(false);
  });
});
