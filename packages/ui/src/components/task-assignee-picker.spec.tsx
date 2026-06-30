import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TaskAssigneePicker } from "./task-assignee-picker.js";

describe("TaskAssigneePicker", () => {
  const members = [
    { userId: "1", userName: "Avery Admin", email: "admin@kloqra.dev" },
    { userId: "2", userName: "Morgan Blake", email: "ops@kloqra.dev" }
  ];

  it("opens by default when no assignees are selected", () => {
    render(<TaskAssigneePicker members={members} value={[]} onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: /Avery Admin/i })).toBeInTheDocument();
    expect(screen.getByText("Select assignees")).toBeInTheDocument();
  });

  it("toggles accordion and shows selected summary", async () => {
    const user = userEvent.setup();
    render(<TaskAssigneePicker members={members} value={["1", "2"]} onChange={() => {}} />);

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Avery Admin/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("checkbox", { name: /Avery Admin/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByRole("checkbox", { name: /Avery Admin/i })).not.toBeInTheDocument();
  });

  it("calls onChange when a member is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TaskAssigneePicker members={members} value={[]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: /Avery Admin/i }));
    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("filters members by search query", async () => {
    const user = userEvent.setup();
    render(<TaskAssigneePicker members={members} value={[]} onChange={() => {}} />);

    await user.type(screen.getByPlaceholderText("Search by name or email…"), "morgan");
    expect(screen.queryByRole("checkbox", { name: /Avery Admin/i })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Morgan Blake/i })).toBeInTheDocument();
  });

  it("reopens when the last assignee is cleared", async () => {
    function Harness() {
      const [value, setValue] = useState<string[]>(["1"]);
      return <TaskAssigneePicker members={members} value={value} onChange={setValue} />;
    }

    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { expanded: false }));
    await user.click(screen.getByRole("checkbox", { name: /Avery Admin/i }));

    expect(screen.getByText("Select assignees")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Avery Admin/i })).toBeInTheDocument();
  });
});
