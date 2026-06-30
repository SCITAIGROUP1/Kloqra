import { describe, expect, it } from "vitest";
import { resolveTimerStartErrorMessage } from "./timer-start-error";

describe("resolveTimerStartErrorMessage", () => {
  it("preserves cross-workspace active timer messages", () => {
    const msg = "You already have a timer running in another workspace.";
    expect(resolveTimerStartErrorMessage(msg)).toBe(msg);
  });

  it("normalizes same-workspace active timer messages", () => {
    expect(resolveTimerStartErrorMessage("Timer already running for this task.")).toBe(
      "A timer is already running. Stop it first."
    );
  });

  it("passes through overlap and other errors unchanged", () => {
    const overlap = "You cannot log time for two projects at once.";
    expect(resolveTimerStartErrorMessage(overlap)).toBe(overlap);
    expect(resolveTimerStartErrorMessage("Network error")).toBe("Network error");
  });
});
