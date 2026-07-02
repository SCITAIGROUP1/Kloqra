import { describe, expect, it } from "vitest";
import {
  DELETE_TASK_TIME_ENTRY_NOTICE,
  getActivateTaskConfirmation,
  getDeactivateTaskConfirmation,
  getDeleteTaskConfirmation,
  getDeleteTaskConfirmationMessage
} from "./task-confirmation";

describe("task confirmation copy", () => {
  it("uses AC copy for linked time entries on delete", () => {
    expect(DELETE_TASK_TIME_ENTRY_NOTICE).toBe(
      "Time entries linked to this task will not be deleted but will lose their task reference."
    );
    const confirmation = getDeleteTaskConfirmation("Design review");
    expect(confirmation.title).toBe("Delete task?");
    expect(confirmation.description).toContain("Design review");
    expect(confirmation.description).toContain(DELETE_TASK_TIME_ENTRY_NOTICE);
    expect(confirmation.destructive).toBe(true);
    expect(getDeleteTaskConfirmationMessage("Design review")).toBe(
      'Delete task?\n\nDelete "Design review"? Time entries linked to this task will not be deleted but will lose their task reference.'
    );
  });

  it("describes deactivate impact on logging and entries", () => {
    const confirmation = getDeactivateTaskConfirmation("Bug fix");
    expect(confirmation.title).toBe("Deactivate task?");
    expect(confirmation.description).toContain("Bug fix");
    expect(confirmation.description).toContain("read-only");
    expect(confirmation.destructive).toBe(true);
  });

  it("describes activate restoring loggability", () => {
    const confirmation = getActivateTaskConfirmation("Research");
    expect(confirmation.title).toBe("Activate task?");
    expect(confirmation.description).toContain("Research");
    expect(confirmation.description).toContain("time logging");
  });
});
