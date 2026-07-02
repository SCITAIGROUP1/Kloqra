import { describe, expect, it } from "vitest";
import {
  assignWorkspaceAdminSchema,
  inviteTenantMemberResponseSchema,
  inviteTenantMemberSchema,
  updateTenantCurrentSchema,
  updateTenantMemberSchema
} from "./tenant.dto";

describe("assignWorkspaceAdminSchema", () => {
  it("accepts userId", () => {
    expect(
      assignWorkspaceAdminSchema.safeParse({
        userId: "00000000-0000-4000-8000-000000000001"
      }).success
    ).toBe(true);
  });

  it("requires email and name for new invite", () => {
    expect(assignWorkspaceAdminSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
    expect(
      assignWorkspaceAdminSchema.safeParse({
        email: "a@b.com",
        name: "Admin User"
      }).success
    ).toBe(true);
  });
});

describe("inviteTenantMemberSchema", () => {
  it("accepts tenant admin invite payload", () => {
    const result = inviteTenantMemberSchema.safeParse({
      email: "delegate@example.com",
      name: "Delegate User",
      role: "ADMIN"
    });
    expect(result.success).toBe(true);
  });

  it("rejects owner role on invite", () => {
    const result = inviteTenantMemberSchema.safeParse({
      email: "delegate@example.com",
      name: "Delegate User",
      role: "OWNER"
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTenantMemberSchema", () => {
  it("requires at least one field", () => {
    expect(updateTenantMemberSchema.safeParse({}).success).toBe(false);
    expect(updateTenantMemberSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateTenantMemberSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
  });
});

describe("updateTenantCurrentSchema", () => {
  it("requires at least one field", () => {
    expect(updateTenantCurrentSchema.safeParse({}).success).toBe(false);
    expect(updateTenantCurrentSchema.safeParse({ name: "Acme Org" }).success).toBe(true);
    expect(updateTenantCurrentSchema.safeParse({ slug: "acme-org" }).success).toBe(true);
  });
});

describe("inviteTenantMemberResponseSchema", () => {
  it("accepts invite response shape", () => {
    const result = inviteTenantMemberResponseSchema.safeParse({
      member: {
        id: "00000000-0000-4000-8000-000000000001",
        tenantId: "00000000-0000-4000-8000-000000000002",
        userId: "00000000-0000-4000-8000-000000000003",
        role: "ADMIN",
        isActive: true,
        userName: "Delegate User",
        userEmail: "delegate@example.com"
      },
      userCreated: true,
      temporaryPassword: "TempPass123!"
    });
    expect(result.success).toBe(true);
  });
});
