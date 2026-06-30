import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useClientTablePagination } from "./use-client-table-pagination";

describe("useClientTablePagination", () => {
  it("pages through in-memory items", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const { result } = renderHook(() => useClientTablePagination(items, 10));

    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.current.totalPages).toBe(3);

    act(() => result.current.setPage(2));
    expect(result.current.pageItems[0]).toBe(11);
  });
});
