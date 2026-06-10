import { render, screen } from "@testing-library/react";
import { ShellToolbarProvider } from "../shell-toolbar-context.js";
import { AppBar, AppBarSecondary } from "./app-bar.js";

describe("AppBar", () => {
  it("renders title, description, and page actions", () => {
    render(
      <AppBar
        title="Team Management"
        description="Manage team members, roles, and permissions."
        actions={<button type="button">Filter</button>}
      />
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team Management" })).toBeInTheDocument();
    expect(screen.getByText("Manage team members, roles, and permissions.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("appends shell toolbar actions after page actions", () => {
    render(
      <ShellToolbarProvider toolbar={<button type="button">Notify</button>}>
        <AppBar title="Dashboard" actions={<button type="button">Add Widgets</button>} />
      </ShellToolbarProvider>
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Add Widgets", "Notify"]);
  });

  it("renders a secondary row for search and primary CTA", () => {
    render(
      <AppBar
        title="Team Management"
        secondary={
          <AppBarSecondary
            leading={<input aria-label="Search team members" />}
            trailing={<button type="button">Add Team Member</button>}
          />
        }
      />
    );

    expect(screen.getByRole("textbox", { name: "Search team members" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Team Member" })).toBeInTheDocument();
  });
});
