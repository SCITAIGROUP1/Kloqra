/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategorySplitWidget } from "./category-split-widget";

describe("CategorySplitWidget", () => {
  it("shows empty state when no time is logged", () => {
    render(<CategorySplitWidget logs={[]} tasks={[]} periodLabel="Jun 2026" />);
    expect(screen.getByText("No time logged in this period")).toBeTruthy();
  });
});
