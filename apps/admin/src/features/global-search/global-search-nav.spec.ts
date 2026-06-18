import { describe, expect, it } from "vitest";
import { filterAdminNavItems, toPageSearchResult } from "./global-search-nav";

describe("global-search-nav", () => {
  it("returns all pages when query is empty", () => {
    expect(filterAdminNavItems("")).toHaveLength(11);
  });

  it("filters pages by label", () => {
    const matches = filterAdminNavItems("billing");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.label).toBe("Billing");
  });

  it("filters pages by keyword", () => {
    const matches = filterAdminNavItems("timesheet");
    expect(matches.some((item) => item.label === "Approvals")).toBe(true);
  });

  it("maps nav items to page search results", () => {
    const item = filterAdminNavItems("dashboard")[0];
    expect(item).toBeDefined();
    expect(toPageSearchResult(item!)).toEqual({
      id: "page:/dashboard",
      type: "page",
      label: "Dashboard",
      href: "/dashboard"
    });
  });
});
