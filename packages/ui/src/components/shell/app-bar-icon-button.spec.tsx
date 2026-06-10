import { render, screen } from "@testing-library/react";
import { AppBarIconButton, appBarIconButtonClass } from "./app-bar-icon-button.js";

describe("AppBarIconButton", () => {
  it("renders a button", () => {
    render(<AppBarIconButton aria-label="Search">S</AppBarIconButton>);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("builds active class names", () => {
    expect(appBarIconButtonClass(undefined, { active: true })).toContain("bg-");
  });
});
