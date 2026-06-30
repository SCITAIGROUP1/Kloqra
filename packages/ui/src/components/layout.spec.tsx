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

  it("supports structured shell toolbar in inline variant", () => {
    render(
      <ShellToolbarProvider
        toolbar={{
          search: <input aria-label="Global search" />,
          actions: <button type="button">Notify</button>
        }}
      >
        <PageHeader
          variant="inline"
          title="Dashboard"
          actions={<button type="button">Filter</button>}
        />
      </ShellToolbarProvider>
    );

    expect(screen.getByRole("button", { name: "Notify" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("supports inline variant without sticky header", () => {
    render(<PageHeader variant="inline" title="Section" description="Details" />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Section" })).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });
});

describe("SegmentedControl", () => {
  class ResizeObserverMock {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe() {
      this.callback([], this);
    }
    unobserve() {}
    disconnect() {}
  }

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

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

  it("re-measures the active highlight when the control resizes", () => {
    const { container } = render(
      <SegmentedControl
        value="week"
        onChange={vi.fn()}
        fullWidth
        options={[
          { value: "today", label: "Today" },
          { value: "week", label: "This week" },
          { value: "month", label: "This month" }
        ]}
      />
    );

    const group = container.querySelector("[role='group']");
    expect(group?.className).toContain("min-w-0");
    expect(screen.getByRole("button", { name: "This week" }).className).toContain("truncate");
  });

  it("positions fullWidth highlight in the active grid column", () => {
    const options = [
      { value: "today" as const, label: "Today" },
      { value: "week" as const, label: "This week" },
      { value: "month" as const, label: "This month" }
    ];

    const { container, rerender } = render(
      <SegmentedControl value="week" onChange={vi.fn()} fullWidth options={options} />
    );

    const highlight = container.querySelector("[role='group'] > [aria-hidden]");
    expect(highlight).toHaveStyle({ gridColumn: "2" });

    rerender(<SegmentedControl value="month" onChange={vi.fn()} fullWidth options={options} />);
    expect(highlight).toHaveStyle({ gridColumn: "3" });
  });

  it("hides highlight when value is not in options", () => {
    const { container } = render(
      <SegmentedControl
        value="custom"
        onChange={vi.fn()}
        fullWidth
        options={[
          { value: "today", label: "Today" },
          { value: "week", label: "This week" }
        ]}
      />
    );

    expect(container.querySelector("[role='group'] > [aria-hidden]")).toBeNull();
  });
});
