import { describe, expect, it } from "vitest";
import {
  canAccessAccountPath,
  canManageOrganization,
  defaultAccountLandingPath,
  isOwnerOnlyAccountPath
} from "./organization-access";

describe("organization-access", () => {
  it("allows organization admin on shared account routes", () => {
    expect(canManageOrganization({ tenantRole: "ADMIN" })).toBe(true);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/account/workspaces")).toBe(true);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/account/workspace-admins")).toBe(true);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/account/organization")).toBe(true);
  });

  it("allows personal account routes for organization operators", () => {
    expect(canAccessAccountPath({ tenantRole: "OWNER" }, "/profile")).toBe(true);
    expect(canAccessAccountPath({ tenantRole: "OWNER" }, "/settings")).toBe(true);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/notifications")).toBe(true);
  });

  it("blocks organization admin from owner-only account routes", () => {
    expect(isOwnerOnlyAccountPath("/account/billing")).toBe(true);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/account")).toBe(false);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/account/billing")).toBe(false);
    expect(canAccessAccountPath({ tenantRole: "ADMIN" }, "/account/members")).toBe(false);
  });

  it("lands organization admin on workspaces", () => {
    expect(defaultAccountLandingPath({ tenantRole: "ADMIN" })).toBe("/account/workspaces");
    expect(defaultAccountLandingPath({ tenantRole: "OWNER" })).toBe("/account");
  });
});
