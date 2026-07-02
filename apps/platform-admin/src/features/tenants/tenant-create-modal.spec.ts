import { createPlatformTenantSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("createPlatformTenantSchema (platform-admin)", () => {
  const base = {
    organizationName: "Acme",
    ownerEmail: "owner@acme.com",
    planId: "00000000-0000-4000-8000-000000000001"
  };

  it("requires organization name, owner email, and plan", () => {
    expect(createPlatformTenantSchema.safeParse({}).success).toBe(false);
    expect(createPlatformTenantSchema.safeParse(base).success).toBe(true);
  });

  it("accepts optional tenant admin email", () => {
    expect(
      createPlatformTenantSchema.safeParse({
        ...base,
        tenantAdminEmail: "admin@acme.com"
      }).success
    ).toBe(true);
  });

  it("rejects tenant admin email matching owner email", () => {
    expect(
      createPlatformTenantSchema.safeParse({
        ...base,
        tenantAdminEmail: "owner@acme.com"
      }).success
    ).toBe(false);
  });
});
