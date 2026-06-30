import { describe, expect, it } from "vitest";
import { groupRowsByField, splitFieldForLayout } from "./export-sheet.util";

describe("export-sheet.util", () => {
  it("splits time entries by member layout", () => {
    expect(splitFieldForLayout("tabs_per_member", "time_entries")).toBe("member");
    expect(splitFieldForLayout("tabs_per_member", "by_member")).toBeNull();
  });

  it("groups rows by member name", () => {
    const groups = groupRowsByField(
      [
        { member: "Bob", date: "2025-06-02" },
        { member: "Alice", date: "2025-06-01" },
        { member: "Alice", date: "2025-06-03" }
      ],
      "member"
    );
    expect([...groups.keys()]).toEqual(["Alice", "Bob"]);
    expect(groups.get("Alice")).toHaveLength(2);
  });
});
