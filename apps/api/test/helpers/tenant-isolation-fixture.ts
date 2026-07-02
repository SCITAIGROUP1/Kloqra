import { PLAN_IDS, PLAN_SLUGS } from "@kloqra/contracts";
import * as bcrypt from "bcrypt";
import type { PrismaService } from "../../src/common/prisma/prisma.service";

export const TENANT_B_OWNER_EMAIL = "owner-b@kloqra.dev";
export const TENANT_B_MEMBER_EMAIL = "member-b@kloqra.dev";
export const ISOLATED_ACME_EMAIL = "isolated-ws-a@kloqra.dev";
const PASSWORD = "password123";

export type TenantBFixture = {
  tenantId: string;
  workspaceId: string;
  projectId: string;
  categoryId: string;
  ownerUserId: string;
  memberUserId: string;
};

export type IsolatedAcmeFixture = {
  userId: string;
  workspaceId: string;
};

export async function createTenantBFixture(prisma: PrismaService): Promise<TenantBFixture> {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Isolation Org B",
      slug: "isolation-org-b",
      status: "active",
      settings: {}
    }
  });

  const owner = await prisma.user.create({
    data: {
      email: TENANT_B_OWNER_EMAIL,
      passwordHash,
      name: "Owner B",
      emailVerifiedAt: new Date()
    }
  });

  const member = await prisma.user.create({
    data: {
      email: TENANT_B_MEMBER_EMAIL,
      passwordHash,
      name: "Member B",
      emailVerifiedAt: new Date()
    }
  });

  await prisma.tenantMember.create({
    data: { tenantId: tenant.id, userId: owner.id, role: "OWNER" }
  });

  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: PLAN_IDS[PLAN_SLUGS.PILOT],
      status: "active"
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      tenantId: tenant.id,
      name: "Isolation Workspace B",
      slug: "isolation-ws-b",
      settings: {}
    }
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: owner.id, role: "ADMIN" },
      { workspaceId: workspace.id, userId: member.id, role: "ADMIN" }
    ]
  });

  const category = await prisma.category.create({
    data: {
      workspaceId: workspace.id,
      name: "Isolation Category B",
      description: "Tenant B category for IDOR tests"
    }
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Isolation Project B",
      clientName: "Tenant B Client",
      team: { create: {} }
    }
  });

  await prisma.teamMember.create({
    data: {
      teamId: (await prisma.team.findUniqueOrThrow({ where: { projectId: project.id } })).id,
      userId: member.id
    }
  });

  return {
    tenantId: tenant.id,
    workspaceId: workspace.id,
    projectId: project.id,
    categoryId: category.id,
    ownerUserId: owner.id,
    memberUserId: member.id
  };
}

export async function createIsolatedAcmeMemberFixture(
  prisma: PrismaService
): Promise<IsolatedAcmeFixture> {
  const acme = await prisma.workspace.findUniqueOrThrow({ where: { slug: "acme" } });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = await prisma.user.create({
    data: {
      email: ISOLATED_ACME_EMAIL,
      passwordHash,
      name: "Isolated Acme Member",
      emailVerifiedAt: new Date()
    }
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: acme.id,
      userId: user.id,
      role: "ADMIN"
    }
  });

  return { userId: user.id, workspaceId: acme.id };
}

export async function cleanupTenantIsolationFixtures(prisma: PrismaService): Promise<void> {
  const emails = [TENANT_B_OWNER_EMAIL, TENANT_B_MEMBER_EMAIL, ISOLATED_ACME_EMAIL];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true }
  });
  const userIds = users.map((u) => u.id);

  const tenant = await prisma.tenant.findUnique({ where: { slug: "isolation-org-b" } });
  if (tenant) {
    await prisma.tenantSalesInquiryReceipt.deleteMany({
      where: { inquiry: { tenantId: tenant.id } }
    });
    await prisma.tenantSalesInquiry.deleteMany({ where: { tenantId: tenant.id } });
  }

  if (userIds.length > 0) {
    await prisma.tenantMember.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.workspaceMember.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.teamMember.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  if (tenant) {
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }
}
