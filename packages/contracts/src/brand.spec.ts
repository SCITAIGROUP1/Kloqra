import { describe, expect, it } from "vitest";
import {
  BRAND_COLORS,
  BRAND_NAME,
  BRAND_PROJECT_COLORS,
  BRAND_SUBTAGLINE,
  BRAND_TAGLINE
} from "./brand";

describe("brand", () => {
  it("exports Kloqra identity strings", () => {
    expect(BRAND_NAME).toBe("Kloqra");
    expect(BRAND_TAGLINE).toContain("Track Time");
    expect(BRAND_SUBTAGLINE).toContain("focus");
  });

  it("uses hex colors for the primary palette", () => {
    expect(BRAND_COLORS.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(BRAND_COLORS.navy).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("defines eight distinct project colors from brand accents", () => {
    expect(BRAND_PROJECT_COLORS).toHaveLength(8);
    expect(new Set(BRAND_PROJECT_COLORS).size).toBe(8);
    expect(BRAND_PROJECT_COLORS[0]).toBe(BRAND_COLORS.primary);
  });
});
