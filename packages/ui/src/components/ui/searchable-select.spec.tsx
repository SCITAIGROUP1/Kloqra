import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AppModal } from "./app-modal.js";
import { SearchableSelect } from "./searchable-select.js";

const OPTIONS = [
  { value: "all", label: "All members" },
  { value: "u1", label: "Alex Chen", keywords: "alex@example.com" },
  { value: "u2", label: "Sam Rivera", keywords: "sam@example.com" }
];

describe("SearchableSelect", () => {
  it("opens, filters, and selects an option", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SearchableSelect
        value="all"
        onValueChange={onValueChange}
        options={OPTIONS}
        placeholder="All members"
        searchPlaceholder="Search members"
        aria-label="Member"
      />
    );

    await user.click(screen.getByRole("combobox", { name: "Member" }));
    expect(screen.getByPlaceholderText("Search members")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search members"), "sam");
    expect(screen.queryByText("Alex Chen")).not.toBeInTheDocument();
    expect(screen.getByText("Sam Rivera")).toBeInTheDocument();

    await user.click(screen.getByText("Sam Rivera"));
    expect(onValueChange).toHaveBeenCalledWith("u2");
  });

  it("updates the trigger label after selecting an option", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [value, setValue] = useState("all");
      return (
        <SearchableSelect
          value={value}
          onValueChange={setValue}
          options={OPTIONS}
          placeholder="All members"
          searchPlaceholder="Search members"
          aria-label="Member"
        />
      );
    }

    render(<Harness />);
    expect(screen.getByRole("combobox", { name: "Member" })).toHaveTextContent("All members");

    await user.click(screen.getByRole("combobox", { name: "Member" }));
    await user.click(screen.getByText("Sam Rivera"));

    expect(screen.getByRole("combobox", { name: "Member" })).toHaveTextContent("Sam Rivera");
  });

  it("shows empty state when no options match", async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value="all"
        onValueChange={() => {}}
        options={OPTIONS}
        searchPlaceholder="Search members"
        emptyMessage="No members found."
        aria-label="Member"
      />
    );

    await user.click(screen.getByRole("combobox", { name: "Member" }));
    await user.type(screen.getByPlaceholderText("Search members"), "zzz");
    expect(screen.getByText("No members found.")).toBeInTheDocument();
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();

    render(
      <SearchableSelect
        value="all"
        onValueChange={() => {}}
        options={OPTIONS}
        disabled
        aria-label="Member"
      />
    );

    await user.click(screen.getByRole("combobox", { name: "Member" }));
    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
  });

  it("shows search input when opened inside AppModal", async () => {
    const user = userEvent.setup();

    render(
      <AppModal open title="Add team member" description="Choose a workspace member.">
        <SearchableSelect
          value=""
          onValueChange={() => {}}
          options={OPTIONS}
          placeholder="Select a workspace member"
          searchPlaceholder="Search by name or email…"
          aria-label="Workspace member"
        />
      </AppModal>
    );

    await user.click(screen.getByRole("combobox", { name: "Workspace member" }));
    expect(screen.getByPlaceholderText("Search by name or email…")).toBeVisible();
  });
});
