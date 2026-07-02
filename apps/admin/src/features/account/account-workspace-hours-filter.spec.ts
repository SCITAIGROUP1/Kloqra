import type { TenantAnalyticsWorkspaceRowDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { filterWorkspaceHoursRows, sortWorkspaceHoursRows } from "./account-workspace-hours-filter";

const rows: TenantAnalyticsWorkspaceRowDto[] = [
  {
    workspaceId: "00000000-0000-4000-8000-000000000001",
    workspaceName: "Acme Corporation",
    totalHours: 196.75,
    billableHours: 196.75,
    billableAmount: 29667.5,
    billablePercent: 100,
    activeMembers: 5,
    currency: "USD"
  },
  {
    workspaceId: "00000000-0000-4000-8000-000000000002",
    workspaceName: "Meridian Product Co.",
    totalHours: 101.25,
    billableHours: 0,
    billableAmount: 0,
    billablePercent: 0,
    activeMembers: 4,
    currency: "USD"
  },
  {
    workspaceId: "00000000-0000-4000-8000-000000000003",
    workspaceName: "Quiet Studio",
    totalHours: 0,
    billableHours: 0,
    billableAmount: 0,
    billablePercent: 0,
    activeMembers: 0
  }
];

describe("filterWorkspaceHoursRows", () => {
  it("filters by workspace name search", () => {
    expect(filterWorkspaceHoursRows(rows, "acme", "ALL")).toHaveLength(1);
    expect(filterWorkspaceHoursRows(rows, "meridian", "ALL")[0]?.workspaceName).toBe(
      "Meridian Product Co."
    );
  });

  it("filters billable and non-billable workspaces", () => {
    expect(filterWorkspaceHoursRows(rows, "", "billable")).toHaveLength(1);
    expect(filterWorkspaceHoursRows(rows, "", "non-billable")).toHaveLength(1);
    expect(filterWorkspaceHoursRows(rows, "", "with-hours")).toHaveLength(2);
    expect(filterWorkspaceHoursRows(rows, "", "no-hours")).toHaveLength(1);
  });
});

describe("sortWorkspaceHoursRows", () => {
  it("sorts by hours descending by default", () => {
    const sorted = sortWorkspaceHoursRows(rows, "hours-desc");
    expect(sorted.map((row) => row.workspaceName)).toEqual([
      "Acme Corporation",
      "Meridian Product Co.",
      "Quiet Studio"
    ]);
  });

  it("sorts by name ascending", () => {
    const sorted = sortWorkspaceHoursRows(rows, "name-asc");
    expect(sorted[0]?.workspaceName).toBe("Acme Corporation");
    expect(sorted.at(-1)?.workspaceName).toBe("Quiet Studio");
  });
});
