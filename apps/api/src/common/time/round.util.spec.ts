import { describe, expect, it } from "vitest";
import { roundExport } from "./round.util";

describe("roundExport", () => {
  it("rounds currency-style values", () => {
    const hours = 5;
    const rate = 50;
    expect(roundExport(hours * rate)).toBe(250);
  });

  it("rounds fractional hours", () => {
    expect(roundExport(3600 / 3600 / 3)).toBe(0.33);
  });
});
