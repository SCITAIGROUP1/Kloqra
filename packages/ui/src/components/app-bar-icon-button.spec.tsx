import { render, screen } from "@testing-library/react";
import { AppBarIconButton } from "./app-bar-icon-button.js";

describe("AppBarIconButton", () => {
  it("renders a button with children", () => {
    render(<AppBarIconButton aria-label="Menu">M</AppBarIconButton>);
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });
});
