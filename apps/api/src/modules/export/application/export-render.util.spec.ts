import { EXPORT_COLUMN_LABELS, resolveExportColumns } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { projectRows, rowsToCsv } from "./export-render.util";

describe("export-render.util", () => {
  it("orders CSV headers by column keys", () => {
    const { headers, lines } = projectRows(
      [{ date: "2025-01-01", project: "Acme", hours: 2 }],
      ["project", "date", "hours"],
      EXPORT_COLUMN_LABELS.time_entries
    );
    expect(headers).toEqual(["Project", "Date", "Hours"]);
    expect(lines[0]).toEqual(["Acme", "2025-01-01", "2"]);
  });

  it("escapes commas in CSV cells", () => {
    const csv = rowsToCsv(["Description"], [['Say "hello", world']]);
    expect(csv).toContain('"Say ""hello"", world"');
  });
});

describe("resolveExportColumns", () => {
  it("returns defaults when columns omitted", () => {
    const cols = resolveExportColumns("time_entries");
    expect(cols[0]).toBe("workspace");
    expect(cols).toContain("hours");
  });

  it("returns custom order when provided", () => {
    const cols = resolveExportColumns("by_project", {
      by_project: ["client", "project", "total_hours"]
    });
    expect(cols).toEqual(["client", "project", "total_hours"]);
  });
});
