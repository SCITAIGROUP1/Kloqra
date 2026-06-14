import { describe, expect, it } from "vitest";
import { getContextualPrompts } from "./assistant-prompts";

describe("getContextualPrompts", () => {
  it("returns timer prompts on timer routes", () => {
    const prompts = getContextualPrompts("/timer");
    expect(prompts).toContain("How do I start a timer?");
    expect(prompts).toContain("Why can't I edit this entry?");
  });

  it("returns timesheet prompts on nested timesheet routes", () => {
    const prompts = getContextualPrompts("/timesheet/week");
    expect(prompts).toContain("How do I add an entry?");
    expect(prompts).toContain("Export my hours");
  });

  it("returns default prompts for unknown routes", () => {
    const prompts = getContextualPrompts("/profile");
    expect(prompts).toEqual(["How do I start a timer?", "Submit my timesheet", "Export my hours"]);
  });
});
