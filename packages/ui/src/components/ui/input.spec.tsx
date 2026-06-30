import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input.js";
import { Label } from "./label.js";

describe("Input", () => {
  it("associates label with input", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" />
      </>
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("accepts controlled value changes", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Name" defaultValue="" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Taylor");
    expect(input).toHaveValue("Taylor");
  });
});
