import { describe, expect, it } from "vitest";
import { slugifyName } from "./slugify";

describe("slugifyName", () => {
  it("slugifies organization names", () => {
    expect(slugifyName("Kloqra Demo Organization")).toBe("kloqra-demo-organization");
    expect(slugifyName("  Acme / Corp  ")).toBe("acme-corp");
  });

  it("truncates to 64 characters", () => {
    expect(slugifyName("a".repeat(80)).length).toBe(64);
  });
});
