import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppBarListToolbar } from "./app-bar-list-toolbar.js";

describe("AppBarListToolbar", () => {
  it("renders search, filters, and action", () => {
    render(
      <AppBarListToolbar
        searchValue=""
        onSearchChange={() => {}}
        searchAriaLabel="Search items"
        filters={<select aria-label="Filter by status" />}
        action={<button type="button">Add item</button>}
      />
    );

    expect(screen.getByRole("textbox", { name: "Search items" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <AppBarListToolbar
        searchValue=""
        onSearchChange={onSearchChange}
        searchAriaLabel="Search items"
      />
    );

    await user.type(screen.getByRole("textbox", { name: "Search items" }), "alpha");
    expect(onSearchChange).toHaveBeenCalled();
  });
});
