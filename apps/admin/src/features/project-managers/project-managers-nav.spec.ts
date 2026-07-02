import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "@/config/admin-nav";
import { projectLeadNavItems } from "@/config/project-manager-nav";

describe("project managers navigation", () => {
  it("exposes project managers in workspace admin nav", () => {
    const item = ADMIN_NAV_ITEMS.find((entry) => entry.href === "/project-managers");
    expect(item?.label).toBe("Project managers");
    expect(item?.keywords).toContain("pm");
  });

  it("hides project managers from project manager nav", () => {
    const leadHrefs = projectLeadNavItems().map((item) => item.href);
    expect(leadHrefs).not.toContain("/project-managers");
  });
});
