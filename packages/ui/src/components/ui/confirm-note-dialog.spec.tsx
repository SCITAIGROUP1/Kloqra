import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmNoteDialog } from "./confirm-note-dialog.js";

describe("ConfirmNoteDialog", () => {
  it("requires a note when noteRequired is true", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmNoteDialog
        open
        title="Reject timesheet?"
        noteRequired
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/Note/i), "Missing descriptions");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith("Missing descriptions");
  });
});
