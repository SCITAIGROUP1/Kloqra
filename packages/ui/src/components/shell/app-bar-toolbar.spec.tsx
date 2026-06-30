import { render, screen } from "@testing-library/react";
import { AppBarToolbar } from "./app-bar-toolbar.js";

describe("AppBarToolbar", () => {
  it("renders page and shell actions", () => {
    render(
      <AppBarToolbar
        pageActions={<button type="button">Filter</button>}
        shellActions={<button type="button">Notify</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify" })).toBeInTheDocument();
  });
});
