import { ErrorCodes } from "@kloqra/contracts";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { TENANT_ROLES_KEY } from "../decorators/tenant-roles.decorator";
import { TenantRolesGuard } from "./tenant-roles.guard";

describe("TenantRolesGuard", () => {
  const reflector = {
    get: vi.fn()
  } as unknown as Reflector;

  const prisma = {
    tenantMember: {
      findUnique: vi.fn()
    }
  } as never;

  const guard = new TenantRolesGuard(reflector, prisma);

  function contextFor(user: { userId: string; tenantId: string }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user })
      }),
      getHandler: () => ({}) as never
    } as never;
  }

  it("rejects users without tenant membership", async () => {
    vi.mocked(reflector.get).mockReturnValue(undefined);
    vi.mocked(prisma.tenantMember.findUnique).mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ userId: "u-1", tenantId: "t-1" }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows any tenant member when no roles are required", async () => {
    vi.mocked(reflector.get).mockReturnValue(undefined);
    vi.mocked(prisma.tenantMember.findUnique).mockResolvedValue({
      tenantId: "t-1",
      role: "ADMIN",
      isActive: true
    });

    await expect(guard.canActivate(contextFor({ userId: "u-1", tenantId: "t-1" }))).resolves.toBe(
      true
    );
    expect(reflector.get).toHaveBeenCalledWith(TENANT_ROLES_KEY, expect.anything());
  });

  it("rejects tenant admin when owner role is required", async () => {
    vi.mocked(reflector.get).mockReturnValue(["OWNER"]);
    vi.mocked(prisma.tenantMember.findUnique).mockResolvedValue({
      tenantId: "t-1",
      role: "ADMIN",
      isActive: true
    });

    await expect(
      guard.canActivate(contextFor({ userId: "u-1", tenantId: "t-1" }))
    ).rejects.toMatchObject({
      response: { code: ErrorCodes.FORBIDDEN }
    });
  });
});
