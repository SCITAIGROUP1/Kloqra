import { describe, expect, it } from "vitest";
import {
  buildGroupsFromMapping,
  buildGroupsPerWorkspace,
  detectCrossTenantConflicts,
  slugifyWorkspaceName,
  type WorkspaceGroup
} from "./migrate-pilots-to-tenants.util";

describe("slugifyWorkspaceName", () => {
  it("slugifies workspace names", () => {
    expect(slugifyWorkspaceName("Acme Corporation", 1)).toBe("acme-corporation");
  });

  it("falls back when name has no alphanumeric characters", () => {
    expect(slugifyWorkspaceName("---", 42)).toBe("tenant-42");
  });
});

describe("detectCrossTenantConflicts", () => {
  const groups: WorkspaceGroup[] = [
    { slug: "acme-corp", name: "Acme", workspaceIds: ["ws-1", "ws-2"] },
    { slug: "other-corp", name: "Other", workspaceIds: ["ws-3"] }
  ];

  it("returns empty when users stay within one tenant", () => {
    const conflicts = detectCrossTenantConflicts(groups, [
      { userId: "u1", workspaceId: "ws-1", user: { email: "admin@acme.com" } },
      { userId: "u1", workspaceId: "ws-2", user: { email: "admin@acme.com" } }
    ]);
    expect(conflicts).toEqual([]);
  });

  it("flags users spanning multiple tenants", () => {
    const conflicts = detectCrossTenantConflicts(groups, [
      { userId: "u1", workspaceId: "ws-1", user: { email: "shared@example.com" } },
      { userId: "u1", workspaceId: "ws-3", user: { email: "shared@example.com" } }
    ]);
    expect(conflicts).toEqual([
      "shared@example.com would belong to tenants: acme-corp, other-corp"
    ]);
  });

  it("deduplicates conflict lines for the same user", () => {
    const conflicts = detectCrossTenantConflicts(groups, [
      { userId: "u1", workspaceId: "ws-1", user: { email: "shared@example.com" } },
      { userId: "u1", workspaceId: "ws-2", user: { email: "shared@example.com" } },
      { userId: "u1", workspaceId: "ws-3", user: { email: "shared@example.com" } }
    ]);
    expect(conflicts).toHaveLength(1);
  });
});

describe("buildGroupsFromMapping", () => {
  it("groups workspaces by mapping file", () => {
    const groups = buildGroupsFromMapping(
      {
        tenants: [
          {
            slug: "acme-corp",
            name: "Acme Corporation",
            workspaceSlugs: ["acme", "meridian"]
          }
        ]
      },
      [
        { id: "id-acme", name: "Acme", slug: "acme" },
        { id: "id-meridian", name: "Meridian", slug: "meridian" }
      ]
    );

    expect(groups).toEqual([
      {
        slug: "acme-corp",
        name: "Acme Corporation",
        workspaceIds: ["id-acme", "id-meridian"]
      }
    ]);
  });

  it("throws when mapping references unknown workspace slug", () => {
    expect(() =>
      buildGroupsFromMapping({ tenants: [{ slug: "x", name: "X", workspaceSlugs: ["missing"] }] }, [
        { id: "id-1", name: "A", slug: "acme" }
      ])
    ).toThrow("Mapping references unknown workspace slug: missing");
  });
});

describe("buildGroupsPerWorkspace", () => {
  it("creates one tenant group per orphan workspace", () => {
    const groups = buildGroupsPerWorkspace(
      [
        { id: "id-1", name: "Solo Workspace", slug: "solo" },
        { id: "id-2", name: "Other", slug: "other" }
      ],
      100
    );

    expect(groups).toEqual([
      { slug: "solo-workspace", name: "Solo Workspace", workspaceIds: ["id-1"] },
      { slug: "other", name: "Other", workspaceIds: ["id-2"] }
    ]);
  });
});
