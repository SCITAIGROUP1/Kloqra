import type { AuthSessionDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspacesStore } from "../stores/workspaces.store";
import { resolveAdminPostAuthPath } from "./resolve-admin-post-auth-path";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("../api/client", () => ({
  api: apiMock
}));

const ownerSession = {
  tenantRole: "OWNER",
  workspaceId: "ws-1",
  workspaceRole: "ADMIN"
} as AuthSessionDto;

const workspaces = [
  { id: "ws-1", name: "Acme", slug: "acme", role: "ADMIN" as const },
  { id: "ws-2", name: "Meridian", slug: "meridian", role: "ADMIN" as const }
];

describe("resolveAdminPostAuthPath", () => {
  beforeEach(() => {
    apiMock.mockReset();
    useWorkspacesStore.getState().clear();
  });

  it("short-circuits to organization setup when workspace setup is required", async () => {
    apiMock.mockResolvedValue({
      id: "t-1",
      name: "Org",
      slug: "org",
      status: "pending_setup",
      settings: {},
      createdAt: new Date().toISOString()
    });

    await expect(
      resolveAdminPostAuthPath({
        tenantRole: "OWNER",
        requiresWorkspaceSetup: true,
        user: { id: "u-1", email: "o@example.com", name: "Owner" }
      } as AuthSessionDto)
    ).resolves.toBe("/account/organization");
    expect(apiMock).toHaveBeenCalledTimes(1);
  });

  it("routes tenant owner with one workspace to select-context", async () => {
    apiMock.mockResolvedValue(workspaces.slice(0, 1));

    await expect(resolveAdminPostAuthPath(ownerSession)).resolves.toBe("/select-context");
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(1);
  });

  it("routes workspace-only admin with multiple workspaces to select-workspace", async () => {
    apiMock.mockResolvedValue(workspaces);

    await expect(
      resolveAdminPostAuthPath({
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      } as AuthSessionDto)
    ).resolves.toBe("/select-workspace");
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(2);
  });
});
