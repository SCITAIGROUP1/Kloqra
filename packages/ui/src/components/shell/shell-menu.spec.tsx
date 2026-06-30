import { render, screen } from "@testing-library/react";
import { ShellMenuItem, ShellMenuPanel } from "./shell-menu.js";

describe("ShellMenu", () => {
  it("renders menu panel and items", () => {
    render(
      <ShellMenuPanel>
        <ShellMenuItem>Settings</ShellMenuItem>
      </ShellMenuPanel>
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
  });
});
