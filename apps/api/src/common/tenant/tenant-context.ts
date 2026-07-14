import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../errors/domain.exception";
import type { PrismaService } from "../prisma/prisma.service";

export type TenantMemberRole = "OWNER" | "ADMIN";

export async function resolveUserTenantId(
  prisma: PrismaService,
  userId: string
): Promise<string | null> {
  const tenantMember = await prisma.tenantMember.findUnique({
    where: { userId },
    select: { tenantId: true }
  });
  if (tenantMember) return tenantMember.tenantId;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, isActive: true },
    select: { workspace: { select: { tenantId: true } } },
    orderBy: { createdAt: "asc" }
  });
  return membership?.workspace.tenantId ?? null;
}

/** D08 — reject if the user already belongs to a different organization. */
export async function assertUserNotInOtherTenant(
  prisma: PrismaService,
  userId: string,
  tenantId: string
): Promise<void> {
  const existingTenantId = await resolveUserTenantId(prisma, userId);
  if (existingTenantId && existingTenantId !== tenantId) {
    throw new DomainException(
      ErrorCodes.CONFLICT,
      "User already belongs to another organization",
      HttpStatus.CONFLICT
    );
  }
}

export async function assertWorkspaceInUserTenant(
  prisma: PrismaService,
  userId: string,
  workspaceTenantId: string | null | undefined
): Promise<string> {
  if (!workspaceTenantId) {
    throw new DomainException(
      ErrorCodes.VALIDATION_ERROR,
      "Workspace is not linked to an organization",
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
  const userTenantId = await resolveUserTenantId(prisma, userId);
  if (!userTenantId || userTenantId !== workspaceTenantId) {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Workspace does not belong to your organization",
      HttpStatus.FORBIDDEN
    );
  }
  return workspaceTenantId;
}

export async function requireTenantOperator(
  prisma: PrismaService,
  userId: string
): Promise<{ tenantId: string }> {
  const tenantMember = await prisma.tenantMember.findUnique({
    where: { userId },
    select: { tenantId: true, role: true, isActive: true }
  });
  if (!tenantMember?.isActive || (tenantMember.role !== "OWNER" && tenantMember.role !== "ADMIN")) {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Only organization owners and admins can perform this action",
      HttpStatus.FORBIDDEN
    );
  }
  return { tenantId: tenantMember.tenantId };
}

export async function requireTenantOwner(
  prisma: PrismaService,
  userId: string
): Promise<{ tenantId: string }> {
  const tenantMember = await prisma.tenantMember.findUnique({
    where: { userId },
    select: { tenantId: true, role: true, isActive: true }
  });
  if (!tenantMember?.isActive || tenantMember.role !== "OWNER") {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Only organization owners can create workspaces",
      HttpStatus.FORBIDDEN
    );
  }
  return { tenantId: tenantMember.tenantId };
}

export async function resolveTenantRoleForUser(
  prisma: PrismaService,
  userId: string,
  tenantId: string
): Promise<TenantMemberRole | undefined> {
  const tenantMember = await prisma.tenantMember.findUnique({
    where: { userId },
    select: { tenantId: true, role: true, isActive: true }
  });
  if (!tenantMember?.isActive || tenantMember.tenantId !== tenantId) {
    return undefined;
  }
  return tenantMember.role as TenantMemberRole;
}

/** Ensures the resolved workspace belongs to the tenant encoded in the JWT. */
export async function assertJwtWorkspaceTenant(
  prisma: PrismaService,
  jwtTenantId: string,
  workspaceId: string
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { tenantId: true }
  });
  if (!workspace) {
    throw new DomainException(ErrorCodes.NOT_FOUND, "Workspace not found", HttpStatus.NOT_FOUND);
  }
  if (workspace.tenantId !== jwtTenantId) {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Workspace does not belong to your organization",
      HttpStatus.FORBIDDEN
    );
  }
}

export async function requireTenantMember(
  prisma: PrismaService,
  userId: string,
  tenantId: string
): Promise<{ tenantId: string; role: TenantMemberRole }> {
  const tenantMember = await prisma.tenantMember.findUnique({
    where: { userId },
    select: { tenantId: true, role: true, isActive: true }
  });
  if (!tenantMember?.isActive || tenantMember.tenantId !== tenantId) {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Organization membership required",
      HttpStatus.FORBIDDEN
    );
  }
  return { tenantId: tenantMember.tenantId, role: tenantMember.role as TenantMemberRole };
}

export async function requireTenantOwnerOrAdmin(
  prisma: PrismaService,
  userId: string,
  tenantId: string
): Promise<{ tenantId: string; role: TenantMemberRole }> {
  const member = await requireTenantMember(prisma, userId, tenantId);
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Insufficient organization permissions",
      HttpStatus.FORBIDDEN
    );
  }
  return member;
}

export async function requireTenantOwnerInTenant(
  prisma: PrismaService,
  userId: string,
  tenantId: string
): Promise<{ tenantId: string; role: TenantMemberRole }> {
  const member = await requireTenantMember(prisma, userId, tenantId);
  if (member.role !== "OWNER") {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Only organization owners can perform this action",
      HttpStatus.FORBIDDEN
    );
  }
  return member;
}
