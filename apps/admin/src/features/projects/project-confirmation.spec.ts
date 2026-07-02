import { describe, expect, it } from "vitest";
import {
  getActivateProjectConfirmation,
  getDeactivateProjectConfirmation
} from "./project-confirmation";

describe("project confirmation copy", () => {
  it("describes deactivate impact on logging and frozen entries", () => {
    const confirmation = getDeactivateProjectConfirmation("Acme Website");
    expect(confirmation.title).toBe("Deactivate project?");
    expect(confirmation.description).toContain("Acme Website");
    expect(confirmation.description).toContain("read-only");
    expect(confirmation.confirmLabel).toBe("Deactivate");
    expect(confirmation.destructive).toBe(true);
  });

  it("describes activate restoring loggability", () => {
    const confirmation = getActivateProjectConfirmation("Mobile App");
    expect(confirmation.title).toBe("Activate project?");
    expect(confirmation.description).toContain("Mobile App");
    expect(confirmation.description).toContain("time logging");
  });
});
