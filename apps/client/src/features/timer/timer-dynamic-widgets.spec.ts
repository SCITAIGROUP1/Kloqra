import { describe, expect, it } from "vitest";

/**
 * Validates that the timer-dynamic-widgets barrel correctly re-exports
 * the lazy-loaded components. These are dynamic() wrappers so we only
 * verify the module shape — rendering is covered by E2E.
 */
describe("timer-dynamic-widgets", () => {
  it("exports DailyGoalWidget", async () => {
    const mod = await import("./timer-dynamic-widgets");
    expect(mod.DailyGoalWidget).toBeDefined();
  });

  it("exports QuickActions", async () => {
    const mod = await import("./timer-dynamic-widgets");
    expect(mod.QuickActions).toBeDefined();
  });

  it("exports StaleTimerDialog", async () => {
    const mod = await import("./timer-dynamic-widgets");
    expect(mod.StaleTimerDialog).toBeDefined();
  });
});
