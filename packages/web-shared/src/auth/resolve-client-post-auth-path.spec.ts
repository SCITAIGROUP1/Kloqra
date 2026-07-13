import type { AuthSessionDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveClientPostAuthPath } from "./resolve-client-post-auth-path";

const { hasMultipleMock, fetchProfileMock } = vi.hoisted(() => ({
  hasMultipleMock: vi.fn(),
  fetchProfileMock: vi.fn()
}));

vi.mock("./workspace-check", () => ({
  hasMultipleWorkspaces: (...args: unknown[]) => hasMultipleMock(...args)
}));

vi.mock("../stores/user-profile.store", () => ({
  fetchUserProfile: (...args: unknown[]) => fetchProfileMock(...args)
}));

const memberSession = {
  workspaceId: "ws-1",
  workspaceRole: "MEMBER",
  user: { id: "u-1", email: "m@example.com", name: "Member" }
} as AuthSessionDto;

describe("resolveClientPostAuthPath", () => {
  beforeEach(() => {
    hasMultipleMock.mockReset();
    fetchProfileMock.mockReset();
  });

  it("routes multi-workspace members to select-workspace", async () => {
    hasMultipleMock.mockResolvedValue(true);
    await expect(resolveClientPostAuthPath(memberSession, "/timer")).resolves.toBe(
      "/select-workspace?next=%2Ftimer"
    );
  });

  it("uses startup preference when a single workspace", async () => {
    hasMultipleMock.mockResolvedValue(false);
    fetchProfileMock.mockResolvedValue({
      preferences: { startupPage: "timer" }
    });
    await expect(resolveClientPostAuthPath(memberSession)).resolves.toBe("/timer");
  });

  it("falls back to dashboard when profile load fails", async () => {
    hasMultipleMock.mockRejectedValue(new Error("offline"));
    await expect(resolveClientPostAuthPath(memberSession)).resolves.toBe("/dashboard");
  });
});
