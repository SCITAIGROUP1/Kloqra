import type { PlanLimits } from "@kloqra/contracts";
import { Prisma } from "../../prisma/generated/client";
import { generatedPrisma } from "../../src/common/prisma/generated-prisma.util";
import type { PrismaService } from "../../src/common/prisma/prisma.service";

function tenantDb(prisma: PrismaService) {
  return generatedPrisma(prisma);
}

export async function setTenantLimitsOverride(
  prisma: PrismaService,
  tenantId: string,
  limitsOverride: Partial<PlanLimits> | null
): Promise<void> {
  await tenantDb(prisma).tenantSubscription.update({
    where: { tenantId },
    data: {
      limitsOverride:
        limitsOverride === null ? Prisma.DbNull : (limitsOverride as Prisma.InputJsonValue)
    }
  });
}

export async function getTenantWorkspaceCount(
  prisma: PrismaService,
  tenantId: string
): Promise<number> {
  return tenantDb(prisma).workspace.count({ where: { tenantId } });
}

export async function getTenantSeatCount(prisma: PrismaService, tenantId: string): Promise<number> {
  const db = tenantDb(prisma);
  const [tenantMembers, workspaceMembers] = await Promise.all([
    db.tenantMember.findMany({
      where: { tenantId, isActive: true },
      select: { userId: true }
    }),
    db.workspaceMember.findMany({
      where: { isActive: true, workspace: { tenantId } },
      select: { userId: true }
    })
  ]);
  return new Set([
    ...tenantMembers.map((member) => member.userId),
    ...workspaceMembers.map((member) => member.userId)
  ]).size;
}

export async function getTenantReportingApiKeyCount(
  prisma: PrismaService,
  tenantId: string
): Promise<number> {
  return tenantDb(prisma).reportingApiCredential.count({
    where: { isActive: true, workspace: { tenantId } }
  });
}
