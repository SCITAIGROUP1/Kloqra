import type { AuthSessionDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  countAdminContexts,
  filterAdminAccessibleWorkspaces,
  resolveAdminContextBreadcrumb,
  shouldShowAdminContextPicker
} from "./admin-context";

const ownerSession = {
  tenantRole: "OWNER",
  workspaceRole: "ADMIN",
  workspaceName: "Acme Corporation",
  managedProjectIds: []
} as unknown as AuthSessionDto;

const opsSession = {
  tenantRole: "ADMIN",
  workspaceRole: "ADMIN",
  workspaceName: "Acme Corporation",
  managedProjectIds: []
} as unknown as AuthSessionDto;

const leadSession = {
  tenantRole: "ADMIN",
  workspaceRole: "MEMBER",
  workspaceName: "Acme Corporation",
  managedProjectIds: ["proj-1"]
} as AuthSessionDto;

const workspaces = [
  { id: "1", name: "Acme Corporation", slug: "acme", role: "ADMIN" as const },
  { id: "2", name: "Meridian Product Co", slug: "meridian", role: "ADMIN" as const },
  {
    id: "3",
    name: "Design Studio",
    slug: "design",
    role: "MEMBER" as const,
    managedProjectIds: ["proj-1"]
  },
  { id: "4", name: "Plain Member", slug: "plain", role: "MEMBER" as const }
];

describe("filterAdminAccessibleWorkspaces", () => {
  it("includes workspace admins and project managers", () => {
    const filtered = filterAdminAccessibleWorkspaces(workspaces);
    expect(filtered.map((w) => w.name)).toEqual([
      "Acme Corporation",
      "Meridian Product Co",
      "Design Studio"
    ]);
  });
});

describe("countAdminContexts", () => {
  it("counts organization plus admin-access workspaces for owners", () => {
    expect(countAdminContexts(ownerSession, workspaces)).toBe(4);
    expect(countAdminContexts(ownerSession, workspaces.slice(0, 2))).toBe(3);
    expect(countAdminContexts(ownerSession, workspaces.slice(0, 1))).toBe(2);
  });

  it("counts only workspaces for non-owners", () => {
    expect(countAdminContexts(opsSession, workspaces.slice(0, 3))).toBe(3);
  });
});

describe("shouldShowAdminContextPicker", () => {
  it("shows picker when there are three or more contexts", () => {
    expect(shouldShowAdminContextPicker(ownerSession, workspaces.slice(0, 2))).toBe(true);
    expect(shouldShowAdminContextPicker(ownerSession, workspaces.slice(0, 1))).toBe(false);
    expect(shouldShowAdminContextPicker(opsSession, workspaces.slice(0, 3))).toBe(true);
  });
});

describe("resolveAdminContextBreadcrumb", () => {
  it("returns organization breadcrumb in account mode", () => {
    expect(
      resolveAdminContextBreadcrumb({
        session: ownerSession,
        tenantName: "Kloqra Demo Organization",
        contextMode: "account"
      })
    ).toEqual([{ label: "Kloqra Demo Organization", href: "/account" }, { label: "Organization" }]);
  });

  it("returns tenant, workspace, and access for owners in workspace mode", () => {
    expect(
      resolveAdminContextBreadcrumb({
        session: ownerSession,
        tenantName: "Kloqra Demo Organization",
        contextMode: "workspace"
      })
    ).toEqual([
      { label: "Kloqra Demo Organization", href: "/account" },
      { label: "Acme Corporation", href: "/dashboard" },
      { label: "Owner · Workspace admin" }
    ]);
  });

  it("returns workspace and access for non-owner workspace admins", () => {
    expect(
      resolveAdminContextBreadcrumb({
        session: opsSession,
        tenantName: "Kloqra Demo Organization",
        contextMode: "workspace"
      })
    ).toEqual([{ label: "Acme Corporation", href: "/dashboard" }, { label: "Organization admin" }]);
  });

  it("labels project managers as project managers", () => {
    expect(
      resolveAdminContextBreadcrumb({
        session: leadSession,
        contextMode: "workspace"
      }).at(-1)?.label
    ).toBe("Project manager");
  });
});
