import { describe, expect, it } from "vitest";
import { getDisplayInitials } from "./shell-utils.js";

describe("getDisplayInitials", () => {
  it("uses first and last name letters when both are present", () => {
    expect(getDisplayInitials("Sarah", "Johnson", "Sarah Johnson")).toBe("SJ");
  });

  it("falls back to word initials when last name is missing", () => {
    expect(getDisplayInitials("Sarah", "", "Sarah Johnson")).toBe("S");
    expect(getDisplayInitials(null, null, "Sarah Johnson")).toBe("SJ");
  });
});
