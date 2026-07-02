import { describe, expect, it, vi } from "vitest";
import { assertTenantAllowsOperations } from "./assert-tenant-operations.util";

describe("assertTenantAllowsOperations", () => {
  it("allows active tenant", async () => {
    const prisma = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ status: "active" }) }
    };
    await expect(
      assertTenantAllowsOperations(prisma as never, "tenant-1")
    ).resolves.toBeUndefined();
  });

  it("blocks suspended tenant", async () => {
    const prisma = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ status: "suspended" }) }
    };
    await expect(assertTenantAllowsOperations(prisma as never, "tenant-1")).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });
});
