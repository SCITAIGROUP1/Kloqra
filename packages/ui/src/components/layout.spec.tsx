import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageHeader, SegmentedControl } from "./layout.js";
import { ShellToolbarProvider } from "./shell-toolbar-context.js";

describe("PageHeader", () => {
  it("renders app bar title and description", () => {
    render(<PageHeader title="Profile" description="Manage your account" />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Manage your account")).toBeInTheDocument();
  });

  it("merges page actions before shell toolbar actions", () => {
    render(
      <ShellToolbarProvider toolbar={<button type="button">Notify</button>}>
        <PageHeader
          title="Dashboard"
          description="Overview"
          actions={<button type="button">Filter</button>}
        />
      </ShellToolbarProvider>
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Filter", "Notify"]);
  });

  it("supports inline variant without sticky header", () => {
    render(<PageHeader variant="inline" title="Section" description="Details" />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Section" })).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });
});

describe("SegmentedControl", () => {
  it("calls onChange when a segment is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SegmentedControl
        value="week"
        onChange={onChange}
        options={[
          { value: "today", label: "Today" },
          { value: "week", label: "This week" }
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(onChange).toHaveBeenCalledWith("today");
  });
});
