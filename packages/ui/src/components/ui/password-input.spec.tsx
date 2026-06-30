import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Label } from "./label.js";
import { PasswordInput } from "./password-input.js";

describe("PasswordInput", () => {
  it("associates label with input", () => {
    render(
      <>
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" />
      </>
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="secret" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
