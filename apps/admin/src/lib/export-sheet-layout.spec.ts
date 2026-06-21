import { describe, expect, it } from "vitest";
import { groupByForSheetLayout, SHEET_LAYOUT_OPTIONS } from "./export-sheet-layout";

describe("export-sheet-layout", () => {
  it("uses AC workbook option labels", () => {
    expect(SHEET_LAYOUT_OPTIONS.map((option) => option.label)).toEqual([
      "Standard Workbook",
      "One Tab per Person",
      "One Tab per Project",
      "One Tab per Client",
      "One Tab per Category"
    ]);
  });
});

describe("groupByForSheetLayout", () => {
  it("replaces layout dimension when switching tab split", () => {
    expect(groupByForSheetLayout("tabs_per_member", ["project", "day"])).toEqual(["member", "day"]);
    expect(groupByForSheetLayout("tabs_per_project", ["member", "day"])).toEqual([
      "project",
      "day"
    ]);
    expect(groupByForSheetLayout("tabs_per_client", ["member", "week"])).toEqual([
      "client",
      "week"
    ]);
  });

  it("preserves reading order when switching to standard workbook", () => {
    expect(groupByForSheetLayout("standard", ["member", "day"])).toEqual(["member", "day"]);
    expect(groupByForSheetLayout("standard", [])).toEqual([]);
  });
});
