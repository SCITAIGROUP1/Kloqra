/**
 * SaaS-F21 — backfill tenants for pilot workspaces with null tenant_id.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.seed.json scripts/migrate-pilots-to-tenants.ts --dry-run
 *   npx tsx --tsconfig tsconfig.seed.json scripts/migrate-pilots-to-tenants.ts --apply
 *   npx tsx --tsconfig tsconfig.seed.json scripts/migrate-pilots-to-tenants.ts --apply --mapping pilot-tenant-map.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildGroupsFromMapping,
  buildGroupsPerWorkspace,
  detectCrossTenantConflicts,
  parseTenantMappingJson,
  type WorkspaceGroup
} from "./migrate-pilots-to-tenants.util";

const prisma = new PrismaClient();

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const apply = process.argv.includes("--apply");
  const mappingIdx = process.argv.indexOf("--mapping");
  const mappingPath = mappingIdx >= 0 ? process.argv[mappingIdx + 1] : undefined;

  if (!dryRun && !apply) {
    console.error("Pass --dry-run or --apply");
    process.exit(1);
  }
  if (dryRun && apply) {
    console.error("Pass only one of --dry-run or --apply");
    process.exit(1);
  }

  return { dryRun, mappingPath };
}

async function loadGroups(mappingPath?: string): Promise<WorkspaceGroup[]> {
  const orphanWorkspaces = await prisma.workspace.findMany({
    where: { tenantId: null },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" }
  });

  if (orphanWorkspaces.length === 0) {
    return [];
  }

  if (mappingPath) {
    const raw = readFileSync(resolve(mappingPath), "utf8");
    const mapping = parseTenantMappingJson(raw);
    return buildGroupsFromMapping(mapping, orphanWorkspaces);
  }

  return buildGroupsPerWorkspace(orphanWorkspaces);
}

async function auditCrossTenantConflicts(groups: WorkspaceGroup[]): Promise<string[]> {
  const workspaceIds = groups.flatMap((group) => group.workspaceIds);
  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId: { in: workspaceIds }, isActive: true },
    select: { userId: true, workspaceId: true, user: { select: { email: true } } }
  });

  return detectCrossTenantConflicts(groups, memberships);
}

async function pickTenantOwner(workspaceIds: string[]): Promise<string | null> {
  const admin = await prisma.workspaceMember.findFirst({
    where: { workspaceId: { in: workspaceIds }, role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { userId: true }
  });
  return admin?.userId ?? null;
}

async function main() {
  const { dryRun, mappingPath } = parseArgs();
  const groups = await loadGroups(mappingPath);

  if (groups.length === 0) {
    console.log("No workspaces with null tenant_id — nothing to migrate.");
    return;
  }

  console.log(
    `Planned ${groups.length} tenant(s) for ${groups.reduce((n, g) => n + g.workspaceIds.length, 0)} workspace(s).`
  );

  const conflicts = await auditCrossTenantConflicts(groups);
  if (conflicts.length > 0) {
    console.error("Cross-tenant user conflicts detected (D08). Resolve before applying:");
    for (const line of conflicts) {
      console.error(`  - ${line}`);
    }
    process.exit(1);
  }

  if (dryRun) {
    for (const group of groups) {
      const ownerId = await pickTenantOwner(group.workspaceIds);
      console.log(
        `[dry-run] tenant ${group.slug} ← workspaces ${group.workspaceIds.length}, ownerUserId=${ownerId ?? "none"}`
      );
    }
    return;
  }

  for (const group of groups) {
    const existing = await prisma.tenant.findUnique({ where: { slug: group.slug } });
    const tenant =
      existing ??
      (await prisma.tenant.create({
        data: {
          name: group.name,
          slug: group.slug,
          status: "active",
          settings: {}
        }
      }));

    await prisma.workspace.updateMany({
      where: { id: { in: group.workspaceIds } },
      data: { tenantId: tenant.id }
    });

    const ownerId = await pickTenantOwner(group.workspaceIds);
    if (ownerId) {
      const existingMember = await prisma.tenantMember.findUnique({ where: { userId: ownerId } });
      if (!existingMember) {
        await prisma.tenantMember.create({
          data: { tenantId: tenant.id, userId: ownerId, role: "OWNER" }
        });
      }
    }

    console.log(`Migrated tenant ${tenant.slug} (${group.workspaceIds.length} workspace(s))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
