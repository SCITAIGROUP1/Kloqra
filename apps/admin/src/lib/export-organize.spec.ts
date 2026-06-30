import { describe, expect, it } from "vitest";
import {
  applyOrganizePreset,
  describeOrganize,
  organizeOptionsForScenario,
  organizePresetFromBody,
  type ExportOrganizePreset
} from "./export-organize";

describe("export-organize", () => {
  const allPresets: ExportOrganizePreset[] = [
    "person_sheets_chronological",
    "person_sheets_by_project",
    "one_file_by_person",
    "one_file_by_project",
    "one_file_by_client",
    "client_sheets_chronological",
    "project_sheets_chronological",
    "summary_by_hours",
    "summary_alphabetical"
  ];

  it.each(allPresets)("applyOrganizePreset(%s) returns sheetLayout and groupBy", (preset) => {
    const applied = applyOrganizePreset(preset);
    expect(applied.sheetLayout).toBeTruthy();
    expect(Array.isArray(applied.groupBy)).toBe(true);
  });

  it("maps payroll default to tabs per member with member and day", () => {
    const applied = applyOrganizePreset("person_sheets_chronological");
    expect(applied).toEqual({
      sheetLayout: "tabs_per_member",
      groupBy: ["member", "day"]
    });
  });

  it.each(allPresets)("describeOrganize returns non-empty text for %s", (preset) => {
    expect(describeOrganize(preset).length).toBeGreaterThan(10);
  });

  it("round-trips preset from body via organizePresetFromBody", () => {
    for (const preset of allPresets) {
      const applied = applyOrganizePreset(preset);
      expect(organizePresetFromBody(applied)).toBe(preset);
    }
  });

  it("organizeOptionsForScenario returns sensible choices per scenario", () => {
    expect(organizeOptionsForScenario("payroll")).toContain("person_sheets_chronological");
    expect(organizeOptionsForScenario("client_billing")).toContain("client_sheets_chronological");
    expect(organizeOptionsForScenario("missing_time").length).toBeGreaterThanOrEqual(2);
  });
});
