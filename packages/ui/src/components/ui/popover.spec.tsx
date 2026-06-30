import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

describe("Popover", () => {
  it("renders trigger content", () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button type="button">Open menu</button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("renders content above modal layers when open", async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger asChild>
          <button type="button">Open menu</button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const content = screen.getByText("Popover body");
    expect(content.closest("[class*='z-[70]']")).toBeInTheDocument();
  });
});
