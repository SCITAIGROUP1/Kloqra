import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogBody, DialogContent } from "./dialog.js";
import { SearchableMultiSelect } from "./searchable-multi-select.js";

const OPTIONS = [
  { value: "u1", label: "Alex Chen", keywords: "alex@example.com" },
  { value: "u2", label: "Sam Rivera", keywords: "sam@example.com" },
  { value: "u3", label: "Jordan Lee", keywords: "jordan@example.com" }
];

describe("SearchableMultiSelect", () => {
  it("filters options and toggles selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SearchableMultiSelect
        value={[]}
        onChange={onChange}
        options={OPTIONS}
        placeholder="Select assignees"
        searchPlaceholder="Search members"
        aria-label="Assignees"
      />
    );

    await user.click(screen.getByRole("combobox", { name: "Assignees" }));
    await user.type(screen.getByPlaceholderText("Search members"), "sam");
    expect(screen.queryByText("Alex Chen")).not.toBeInTheDocument();

    await user.click(screen.getByText("Sam Rivera"));
    expect(onChange).toHaveBeenCalledWith(["u2"]);
  });

  it("selects all options", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SearchableMultiSelect
        value={[]}
        onChange={onChange}
        options={OPTIONS}
        aria-label="Assignees"
      />
    );

    await user.click(screen.getByRole("combobox", { name: "Assignees" }));
    await user.click(screen.getByText("Select all"));
    expect(onChange).toHaveBeenCalledWith(["u1", "u2", "u3"]);
  });

  it("locks dialog body scroll while the menu is open", async () => {
    const user = userEvent.setup();

    render(
      <Dialog open>
        <DialogContent>
          <DialogBody>
            <SearchableMultiSelect
              value={[]}
              onChange={vi.fn()}
              options={OPTIONS}
              aria-label="Assignees"
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    );

    const body = document.querySelector("[data-dialog-body]") as HTMLElement;
    expect(body.style.overflow).toBe("");

    await user.click(screen.getByRole("combobox", { name: "Assignees" }));
    expect(body.style.overflow).toBe("hidden");
  });
});
