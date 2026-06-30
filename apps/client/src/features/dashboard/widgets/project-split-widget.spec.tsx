/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectSplitWidget } from "./project-split-widget";

describe("ProjectSplitWidget", () => {
  it("shows empty state when no time is logged", () => {
    render(<ProjectSplitWidget logs={[]} projects={[]} tasks={[]} />);
    expect(screen.getByText("No time logged in this period")).toBeTruthy();
  });
});
