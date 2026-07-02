import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "./admin-nav";
import { canAccessAdminApp, isProjectLeadOnly, projectLeadNavItems } from "./project-manager-nav";

describe("projectLeadNavItems", () => {
  it("omits admin-only sections for project managers", () => {
    const hrefs = projectLeadNavItems().map((item) => item.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/approvals");
    expect(hrefs).not.toContain("/exports");
    expect(hrefs).not.toContain("/team-management");
    expect(hrefs).not.toContain("/billing");
    expect(hrefs.length).toBeLessThan(ADMIN_NAV_ITEMS.length);
  });
});

describe("canAccessAdminApp", () => {
  it("allows workspace admin", () => {
    expect(canAccessAdminApp("ADMIN", undefined)).toBe(true);
  });

  it("allows member with led projects", () => {
    expect(canAccessAdminApp("MEMBER", ["proj-1"])).toBe(true);
  });

  it("denies plain member", () => {
    expect(canAccessAdminApp("MEMBER", [])).toBe(false);
    expect(canAccessAdminApp("MEMBER", undefined)).toBe(false);
  });
});

describe("isProjectLeadOnly", () => {
  it("detects lead-only members", () => {
    expect(isProjectLeadOnly("MEMBER", ["proj-1"])).toBe(true);
    expect(isProjectLeadOnly("ADMIN", ["proj-1"])).toBe(false);
  });
});
