import { describe, expect, it } from "vitest";
import { PROJECT_COLORS } from "../project-colors";
import { createProjectSchema, projectColorSchema } from "./project.dto";

describe("projectColorSchema", () => {
  it("accepts curated palette colors", () => {
    expect(projectColorSchema.safeParse(PROJECT_COLORS[0]).success).toBe(true);
  });

  it("accepts custom hex outside the palette", () => {
    expect(projectColorSchema.safeParse("#ff00aa").success).toBe(true);
  });

  it("rejects invalid hex values", () => {
    expect(projectColorSchema.safeParse("red").success).toBe(false);
    expect(projectColorSchema.safeParse("#fff").success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("accepts create payload with custom project color", () => {
    const result = createProjectSchema.safeParse({
      name: "Custom Color Project",
      color: "#a1b2c3"
    });
    expect(result.success).toBe(true);
  });
});
