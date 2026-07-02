import { HttpStatus } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DomainException } from "../errors/domain.exception";
import {
  assertJwtWorkspaceTenant,
  assertWorkspaceInUserTenant,
  requireTenantMember,
  requireTenantOwner,
  requireTenantOwnerInTenant,
  requireTenantOwnerOrAdmin,
  resolveUserTenantId
} from "./tenant-context";

describe("tenant-context", () => {
  it("resolveUserTenantId prefers tenant_members row", async () => {
    const prisma = {
      tenantMember: { findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1" }) },
      workspaceMember: { findFirst: vi.fn() }
    } as never;

    await expect(resolveUserTenantId(prisma, "u-1")).resolves.toBe("t-1");
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });

  it("resolveUserTenantId falls back to first workspace tenant", async () => {
    const prisma = {
      tenantMember: { findUnique: vi.fn().mockResolvedValue(null) },
      workspaceMember: {
        findFirst: vi.fn().mockResolvedValue({ workspace: { tenantId: "t-2" } })
      }
    } as never;

    await expect(resolveUserTenantId(prisma, "u-1")).resolves.toBe("t-2");
  });

  it("assertWorkspaceInUserTenant rejects cross-tenant workspace", async () => {
    const prisma = {
      tenantMember: { findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1" }) },
      workspaceMember: { findFirst: vi.fn() }
    } as never;

    await expect(assertWorkspaceInUserTenant(prisma, "u-1", "t-2")).rejects.toBeInstanceOf(
      DomainException
    );
    await expect(assertWorkspaceInUserTenant(prisma, "u-1", "t-2")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: HttpStatus.FORBIDDEN
    });
  });

  it("requireTenantOwner rejects non-owners", async () => {
    const prisma = {
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1", role: "ADMIN", isActive: true })
      }
    } as never;

    await expect(requireTenantOwner(prisma, "u-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireTenantOwner returns tenantId for owners", async () => {
    const prisma = {
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1", role: "OWNER", isActive: true })
      }
    } as never;

    await expect(requireTenantOwner(prisma, "u-1")).resolves.toEqual({ tenantId: "t-1" });
  });

  it("assertJwtWorkspaceTenant rejects workspace in another tenant", async () => {
    const prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t-2" })
      }
    } as never;

    await expect(assertJwtWorkspaceTenant(prisma, "t-1", "ws-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: HttpStatus.FORBIDDEN
    });
  });

  it("assertJwtWorkspaceTenant passes when tenant matches", async () => {
    const prisma = {
      workspace: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1" })
      }
    } as never;

    await expect(assertJwtWorkspaceTenant(prisma, "t-1", "ws-1")).resolves.toBeUndefined();
  });

  it("requireTenantMember rejects workspace-only users", async () => {
    const prisma = {
      tenantMember: { findUnique: vi.fn().mockResolvedValue(null) }
    } as never;

    await expect(requireTenantMember(prisma, "u-1", "t-1")).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("requireTenantOwnerOrAdmin allows tenant admin", async () => {
    const prisma = {
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1", role: "ADMIN", isActive: true })
      }
    } as never;

    await expect(requireTenantOwnerOrAdmin(prisma, "u-1", "t-1")).resolves.toEqual({
      tenantId: "t-1",
      role: "ADMIN"
    });
  });

  it("requireTenantOwnerInTenant rejects tenant admin", async () => {
    const prisma = {
      tenantMember: {
        findUnique: vi.fn().mockResolvedValue({ tenantId: "t-1", role: "ADMIN", isActive: true })
      }
    } as never;

    await expect(requireTenantOwnerInTenant(prisma, "u-1", "t-1")).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });
});
