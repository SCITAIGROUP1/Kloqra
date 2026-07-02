import type { Prisma, User } from "@prisma/client";

/** Workspace membership row shape (includes is_active added in 20260616120000). */
export type WorkspaceMemberWithUser = {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  user: User;
};

export type WorkspaceMembershipWithWorkspace = {
  workspaceId: string;
  role: string;
  isActive?: boolean;
  workspace: { name: string; tenantId: string };
};

export type UserWithMemberships = {
  memberships: WorkspaceMembershipWithWorkspace[];
};

export function toWorkspaceMemberWithUser(
  member: {
    id: string;
    workspaceId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user: User;
  } & { isActive?: boolean }
): WorkspaceMemberWithUser {
  return {
    ...member,
    isActive: member.isActive ?? true
  };
}

export function isWorkspaceMembershipActive(member: unknown): boolean {
  if (!member || typeof member !== "object") return true;
  const record = member as { isActive?: boolean };
  return record.isActive ?? true;
}

export function activeWorkspaceMemberWhere(
  where: Prisma.WorkspaceMemberWhereInput
): Prisma.WorkspaceMemberWhereInput {
  return { ...where, isActive: true } as Prisma.WorkspaceMemberWhereInput;
}

export function activeMembershipsInclude() {
  return {
    where: activeWorkspaceMemberWhere({}),
    include: { workspace: true },
    orderBy: { createdAt: "asc" as const },
    take: 1
  };
}

export function asUserWithMemberships<T extends object>(
  user: T | null
): (T & UserWithMemberships) | null {
  return user as (T & UserWithMemberships) | null;
}
