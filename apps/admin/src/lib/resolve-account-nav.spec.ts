import { describe, expect, it } from "vitest";
import { resolveAccountNavItems } from "./resolve-account-nav";

describe("resolveAccountNavItems", () => {
  it("returns full account nav for organization owner", () => {
    const items = resolveAccountNavItems({ tenantRole: "OWNER" });
    expect(items.map((item) => item.href)).toContain("/account/billing");
    expect(items.map((item) => item.href)).toContain("/account/members");
  });

  it("returns operational account nav for organization admin", () => {
    const items = resolveAccountNavItems({ tenantRole: "ADMIN" });
    const hrefs = items.map((item) => item.href);
    expect(hrefs).toContain("/account/workspaces");
    expect(hrefs).toContain("/account/workspace-admins");
    expect(hrefs).not.toContain("/account/billing");
    expect(hrefs).not.toContain("/account/members");
    expect(hrefs).not.toContain("/account");
  });
});
