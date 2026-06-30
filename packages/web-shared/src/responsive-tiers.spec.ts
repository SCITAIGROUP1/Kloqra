import { describe, expect, it } from "vitest";
import {
  COMPACT_LAPTOP_SHELL_MAX,
  COMPACT_LAPTOP_SHELL_MIN,
  COMPACT_LAPTOP_VIEWPORT,
  COMPACT_LAPTOP_VIEWPORT_MAX,
  COMFORTABLE_DESKTOP_SHELL_MIN,
  EXPORT_TWO_COLUMN_SHELL_MIN
} from "./responsive-tiers";

describe("responsive-tiers", () => {
  it("defines a compact laptop band below comfortable desktop", () => {
    expect(COMPACT_LAPTOP_SHELL_MIN).toBeLessThan(COMPACT_LAPTOP_SHELL_MAX);
    expect(COMPACT_LAPTOP_SHELL_MAX).toBeLessThan(COMFORTABLE_DESKTOP_SHELL_MIN);
  });

  it("auto-collapse threshold targets sub-1400px laptops", () => {
    expect(COMPACT_LAPTOP_VIEWPORT_MAX).toBeGreaterThan(COMPACT_LAPTOP_VIEWPORT.width);
  });

  it("documents the standard QA viewport", () => {
    expect(COMPACT_LAPTOP_VIEWPORT).toEqual({ width: 1366, height: 768 });
  });

  it("keeps export side-by-side layout for wide shells only", () => {
    expect(EXPORT_TWO_COLUMN_SHELL_MIN).toBeGreaterThan(COMPACT_LAPTOP_SHELL_MAX);
  });
});
