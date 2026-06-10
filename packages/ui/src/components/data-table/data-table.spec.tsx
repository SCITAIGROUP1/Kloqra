import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TablePagination } from "./data-table";

describe("TablePagination", () => {
  it("navigates pages", () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination page={2} totalPages={3} total={55} limit={20} onPageChange={onPageChange} />
    );

    expect(screen.getByText(/showing 21–40 of 55/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
