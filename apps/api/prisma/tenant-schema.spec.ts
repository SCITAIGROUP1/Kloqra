import { describe, expect, it } from "vitest";
import { Prisma } from "./generated/client";

describe("tenant prisma schema", () => {
  it("includes Tenant and TenantMember models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
    expect(modelNames).toContain("Tenant");
    expect(modelNames).toContain("TenantMember");
  });

  it("Workspace model includes required tenantId FK", () => {
    const workspace = Prisma.dmmf.datamodel.models.find((m) => m.name === "Workspace");
    const tenantId = workspace?.fields.find((f) => f.name === "tenantId");
    expect(tenantId).toBeDefined();
    expect(tenantId?.isRequired).toBe(true);
  });

  it("TenantMember enforces one row per user", () => {
    const tenantMember = Prisma.dmmf.datamodel.models.find((m) => m.name === "TenantMember");
    const userIdField = tenantMember?.fields.find((f) => f.name === "userId");
    expect(userIdField?.isUnique).toBe(true);
  });

  it("includes Plan and TenantSubscription models", () => {
    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);
    expect(modelNames).toContain("Plan");
    expect(modelNames).toContain("TenantSubscription");
  });

  it("TenantSubscription enforces one row per tenant", () => {
    const subscription = Prisma.dmmf.datamodel.models.find((m) => m.name === "TenantSubscription");
    const tenantIdField = subscription?.fields.find((f) => f.name === "tenantId");
    expect(tenantIdField?.isUnique).toBe(true);
  });
});
