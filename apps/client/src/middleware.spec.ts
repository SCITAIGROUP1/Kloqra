import { describe, expect, it } from "vitest";

describe("middleware config", () => {
  it("exports matcher for /o/:slug routes", async () => {
    const mod = await import("./middleware");
    expect(mod.config.matcher).toContain("/o/:slug");
    expect(mod.config.matcher).toContain("/o/:slug/login");
  });
});
