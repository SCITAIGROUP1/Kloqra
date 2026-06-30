import { render, screen } from "@testing-library/react";
import { AppBarActionButton } from "./app-bar-action-button.js";

describe("AppBarActionButton", () => {
  it("renders an action button", () => {
    render(<AppBarActionButton>Export</AppBarActionButton>);
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
