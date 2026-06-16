import { HARD_AUTO_STOP_HOURS } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { formatAutoStopToastMessage } from "./timer-autostop-message";

describe("formatAutoStopToastMessage", () => {
  it("uses HARD_AUTO_STOP_HOURS from contracts", () => {
    expect(formatAutoStopToastMessage()).toBe(
      `Your timer was automatically stopped after ${HARD_AUTO_STOP_HOURS} hours. A time entry was saved on your behalf.`
    );
  });
});
