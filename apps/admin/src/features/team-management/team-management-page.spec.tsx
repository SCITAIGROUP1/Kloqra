import { describe, expect, it } from "vitest";
import { formatLastActive, formatWeekHours } from "./format-last-active";

describe("formatLastActive", () => {
  it("returns Now when tracking", () => {
    expect(formatLastActive("2020-01-01T00:00:00.000Z", true)).toBe("Now");
  });

  it("returns Never when no timestamp", () => {
    expect(formatLastActive(null, false)).toBe("Never");
  });

  it("formats recent minutes", () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatLastActive(recent, false)).toBe("5 mins ago");
  });
});

describe("formatWeekHours", () => {
  it("formats zero and fractional hours", () => {
    expect(formatWeekHours(0)).toBe("0h");
    expect(formatWeekHours(32.5)).toBe("32.5h");
  });
});
