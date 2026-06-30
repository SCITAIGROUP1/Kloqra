import { describe, expect, it } from "vitest";
import { sortRowsForGroupBy } from "./export-sort.util";

describe("sortRowsForGroupBy", () => {
  it("sorts time entries by combined dimensions in order", () => {
    const rows = [
      { project: "Beta", member: "Alice", date: "2025-06-02" },
      { project: "Alpha", member: "Bob", date: "2025-06-01" },
      { project: "Alpha", member: "Alice", date: "2025-06-03" }
    ];

    const sorted = sortRowsForGroupBy(rows, "time_entries", ["project", "member"]);

    expect(sorted.map((r) => [r.project, r.member])).toEqual([
      ["Alpha", "Alice"],
      ["Alpha", "Bob"],
      ["Beta", "Alice"]
    ]);
  });
});
