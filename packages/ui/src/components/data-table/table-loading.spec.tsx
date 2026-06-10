import { render, screen } from "@testing-library/react";
import { TableLoadingState } from "./table-loading.js";

describe("TableLoadingState", () => {
  it("renders skeleton rows", () => {
    const { container } = render(<TableLoadingState rows={2} columns={3} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
