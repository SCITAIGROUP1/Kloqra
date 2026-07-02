export type TenantMappingFile = {
  tenants: Array<{
    slug: string;
    name: string;
    workspaceSlugs: string[];
  }>;
};

export type WorkspaceGroup = {
  slug: string;
  name: string;
  workspaceIds: string[];
};

export type OrphanWorkspace = {
  id: string;
  name: string;
  slug: string;
};

export type WorkspaceMembershipRow = {
  userId: string;
  workspaceId: string;
  user: { email: string };
};

export function slugifyWorkspaceName(name: string, now = Date.now()): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || `tenant-${now}`
  );
}

export function buildWorkspaceTenantMap(groups: WorkspaceGroup[]): Map<string, string> {
  const workspaceTenant = new Map<string, string>();
  for (const group of groups) {
    for (const workspaceId of group.workspaceIds) {
      workspaceTenant.set(workspaceId, group.slug);
    }
  }
  return workspaceTenant;
}

export function detectCrossTenantConflicts(
  groups: WorkspaceGroup[],
  memberships: WorkspaceMembershipRow[]
): string[] {
  const workspaceTenant = buildWorkspaceTenantMap(groups);

  const userTenants = new Map<string, Set<string>>();
  for (const row of memberships) {
    const tenantSlug = workspaceTenant.get(row.workspaceId);
    if (!tenantSlug) continue;
    const set = userTenants.get(row.userId) ?? new Set<string>();
    set.add(tenantSlug);
    userTenants.set(row.userId, set);
  }

  const conflicts: string[] = [];
  for (const row of memberships) {
    const tenantSlug = workspaceTenant.get(row.workspaceId);
    const tenants = userTenants.get(row.userId);
    if (tenantSlug && tenants && tenants.size > 1) {
      conflicts.push(`${row.user.email} would belong to tenants: ${[...tenants].join(", ")}`);
    }
  }

  return [...new Set(conflicts)];
}

export function buildGroupsFromMapping(
  mapping: TenantMappingFile,
  orphanWorkspaces: OrphanWorkspace[]
): WorkspaceGroup[] {
  const bySlug = new Map(orphanWorkspaces.map((ws) => [ws.slug, ws]));

  return mapping.tenants.map((tenant) => {
    const workspaceIds: string[] = [];
    for (const wsSlug of tenant.workspaceSlugs) {
      const ws = bySlug.get(wsSlug);
      if (!ws) {
        throw new Error(`Mapping references unknown workspace slug: ${wsSlug}`);
      }
      workspaceIds.push(ws.id);
      bySlug.delete(wsSlug);
    }
    return { slug: tenant.slug, name: tenant.name, workspaceIds };
  });
}

export function buildGroupsPerWorkspace(
  orphanWorkspaces: OrphanWorkspace[],
  now = Date.now()
): WorkspaceGroup[] {
  return orphanWorkspaces.map((ws) => ({
    slug: slugifyWorkspaceName(ws.name, now),
    name: ws.name,
    workspaceIds: [ws.id]
  }));
}

export function parseTenantMappingJson(raw: string): TenantMappingFile {
  return JSON.parse(raw) as TenantMappingFile;
}
