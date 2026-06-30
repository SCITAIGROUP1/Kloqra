/** @vitest-environment jsdom */
import { DEFAULT_TABLE_PAGE_SIZE } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePaginatedList } from "./use-paginated-list";

const fetchPaginatedList = vi.fn();

vi.mock("../api/fetch-list-items", () => ({
  fetchPaginatedList: (...args: unknown[]) => fetchPaginatedList(...args)
}));

describe("usePaginatedList", () => {
  beforeEach(() => {
    fetchPaginatedList.mockReset();
    fetchPaginatedList.mockResolvedValue({
      items: [{ id: "1" }],
      total: 1,
      totalPages: 1
    });
  });

  it("does not refetch on every render when filters is a new object with the same values", async () => {
    const { rerender } = renderHook(
      ({ filters }) =>
        usePaginatedList<{ id: string }>({
          workspaceId: "ws-1",
          basePath: "/tasks",
          filters
        }),
      { initialProps: { filters: { projectId: "p-1" } } }
    );

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));

    rerender({ filters: { projectId: "p-1" } });
    rerender({ filters: { projectId: "p-1" } });

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));
  });

  it("refetches when serialized filters change", async () => {
    const { rerender } = renderHook(
      ({ filters }) =>
        usePaginatedList<{ id: string }>({
          workspaceId: "ws-1",
          basePath: "/tasks",
          filters
        }),
      { initialProps: { filters: { projectId: "p-1" } } }
    );

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));

    rerender({ filters: { projectId: "p-2" } });

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(2));
  });

  it("refetches with new limit and resets page when limit changes", async () => {
    fetchPaginatedList.mockResolvedValue({
      items: Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) })),
      total: 25,
      totalPages: 2,
      page: 1,
      limit: 10
    });

    const { result } = renderHook(() =>
      usePaginatedList<{ id: string }>({
        workspaceId: "ws-1",
        basePath: "/tasks"
      })
    );

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));
    expect(fetchPaginatedList).toHaveBeenLastCalledWith("/tasks", {
      workspaceId: "ws-1",
      page: 1,
      limit: DEFAULT_TABLE_PAGE_SIZE,
      search: "",
      filters: undefined
    });
    expect(result.current.limit).toBe(DEFAULT_TABLE_PAGE_SIZE);

    await act(async () => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(2));
    expect(result.current.page).toBe(2);

    await act(async () => {
      result.current.setLimit(25);
    });
    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(3));
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(25);
    expect(fetchPaginatedList).toHaveBeenLastCalledWith("/tasks", {
      workspaceId: "ws-1",
      page: 1,
      limit: 25,
      search: "",
      filters: undefined
    });
  });

  it("refetches when a watched workspace scope becomes stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("../realtime/workspace-data-sync");

    renderHook(() =>
      usePaginatedList<{ id: string }>({
        workspaceId: "ws-1",
        basePath: "/tasks",
        refreshOnStaleScopes: ["tasks"]
      })
    );

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
          detail: { workspaceId: "ws-1", scopes: ["tasks"] }
        })
      );
    });

    await waitFor(() => expect(fetchPaginatedList).toHaveBeenCalledTimes(2));
  });
});
