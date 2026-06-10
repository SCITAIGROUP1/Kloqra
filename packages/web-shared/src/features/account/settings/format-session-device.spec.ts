import { describe, expect, it } from "vitest";
import { formatSessionDevice } from "./format-session-device";

describe("formatSessionDevice", () => {
  it("returns Unknown device when user agent is missing", () => {
    expect(formatSessionDevice(null)).toBe("Unknown device");
    expect(formatSessionDevice("")).toBe("Unknown device");
  });

  it("parses Chrome on macOS", () => {
    expect(
      formatSessionDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe("Chrome on macOS");
  });

  it("parses Safari on macOS", () => {
    expect(
      formatSessionDevice(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
      )
    ).toBe("Safari on macOS");
  });
});
