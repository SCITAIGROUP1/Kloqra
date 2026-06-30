import { describe, expect, it } from "vitest";
import {
  enumerateDateKeysInRange,
  formatExportDateKey,
  isWeekdayDateKey
} from "./export-format.util";

describe("export-format.util", () => {
  it("formats date keys in workspace timezone", () => {
    const utcEvening = new Date("2025-06-18T23:30:00.000Z");
    expect(formatExportDateKey(utcEvening, "UTC")).toBe("2025-06-18");
    expect(formatExportDateKey(utcEvening, "America/New_York")).toBe("2025-06-18");
    expect(formatExportDateKey(utcEvening, "Australia/Sydney")).toBe("2025-06-19");
  });

  it("enumerates inclusive date keys", () => {
    const from = new Date("2025-06-01T00:00:00.000Z");
    const to = new Date("2025-06-03T23:59:59.000Z");
    expect(enumerateDateKeysInRange(from, to, "UTC")).toEqual([
      "2025-06-01",
      "2025-06-02",
      "2025-06-03"
    ]);
  });

  it("detects weekdays from date keys", () => {
    expect(isWeekdayDateKey("2025-06-16")).toBe(true);
    expect(isWeekdayDateKey("2025-06-15")).toBe(false);
  });
});
