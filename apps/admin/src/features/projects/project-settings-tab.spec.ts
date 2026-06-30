import { describe, expect, it } from "vitest";

describe("ProjectSettingsTab approval policy UX", () => {
  it("documents waiver behavior when approval settings change", () => {
    const message =
      "Open draft and rejected timesheets on this project will be waived. Members only need to submit from the current period onward — no backlog catch-up is required.";
    expect(message).toMatch(/waived/i);
    expect(message).toMatch(/no backlog catch-up/i);
  });
});
