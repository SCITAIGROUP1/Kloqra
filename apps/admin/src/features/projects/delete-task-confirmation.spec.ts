import { describe, expect, it } from "vitest";
import {
  DELETE_TASK_TIME_ENTRY_NOTICE,
  getDeleteTaskConfirmationMessage
} from "./delete-task-confirmation";

describe("getDeleteTaskConfirmationMessage", () => {
  it("uses AC copy for linked time entries", () => {
    expect(DELETE_TASK_TIME_ENTRY_NOTICE).toBe(
      "Time entries linked to this task will not be deleted but will lose their task reference."
    );
    expect(getDeleteTaskConfirmationMessage("Design review")).toBe(
      'Delete task "Design review"?\n\nTime entries linked to this task will not be deleted but will lose their task reference.'
    );
  });
});
