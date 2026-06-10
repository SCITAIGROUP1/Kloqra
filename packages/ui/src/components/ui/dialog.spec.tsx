import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./dialog.js";

describe("Dialog", () => {
  it("renders dialog title when open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("calls onOpenChange when close button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Active sessions</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>Session list</p>
          </DialogBody>
          <DialogFooter>
            <button type="button">Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[0]!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
