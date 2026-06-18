import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { JiraIssuePicker } from "./jira-issue-picker";

afterEach(() => cleanup());

const issues = [
  { key: "PROJ-1", summary: "Fix login bug", statusCategory: "In Progress" },
  { key: "PROJ-2", summary: "Build dashboard", statusCategory: "In Progress" }
];

describe("JiraIssuePicker", () => {
  it("renders nothing when issues list is empty", () => {
    const { container } = render(<JiraIssuePicker issues={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a button for each issue", () => {
    render(<JiraIssuePicker issues={issues} onSelect={vi.fn()} />);
    expect(screen.getByText("PROJ-1")).toBeTruthy();
    expect(screen.getByText("PROJ-2")).toBeTruthy();
  });

  it("shows the issue count label", () => {
    render(<JiraIssuePicker issues={issues} onSelect={vi.fn()} />);
    expect(screen.getByText("Jira — In Progress (2)")).toBeTruthy();
  });

  it("calls onSelect with key and summary when a ticket is clicked", () => {
    const onSelect = vi.fn();
    render(<JiraIssuePicker issues={issues} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("PROJ-1").closest("button")!);

    expect(onSelect).toHaveBeenCalledWith("PROJ-1: Fix login bug");
  });

  it("calls onSelect with the correct issue when second ticket is clicked", () => {
    const onSelect = vi.fn();
    render(<JiraIssuePicker issues={issues} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("PROJ-2").closest("button")!);

    expect(onSelect).toHaveBeenCalledWith("PROJ-2: Build dashboard");
  });
});
