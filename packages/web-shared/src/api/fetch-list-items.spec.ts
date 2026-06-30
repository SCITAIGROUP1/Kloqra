import type { PaginatedResponse } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchListItems, normalizePaginatedListResponse } from "./fetch-list-items";
import { buildListCacheKey, setCachedListItems } from "./list-items-cache";

const api = vi.fn();

vi.mock("./client", () => ({
  api: (...args: unknown[]) => api(...args)
}));

describe("normalizePaginatedListResponse", () => {
  it("unwraps legacy array list responses", () => {
    const normalized = normalizePaginatedListResponse([{ id: "p1" }], 1, 20);
    expect(normalized.items).toEqual([{ id: "p1" }]);
    expect(normalized.total).toBe(1);
  });

  it("unwraps paginated list responses", () => {
    const normalized = normalizePaginatedListResponse(
      { items: [{ id: "p2" }], page: 2, limit: 20, total: 45, totalPages: 3 },
      2,
      20
    );
    expect(normalized.items).toEqual([{ id: "p2" }]);
    expect(normalized.page).toBe(2);
    expect(normalized.totalPages).toBe(3);
  });

  it("defaults missing items to an empty array", () => {
    const malformed = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    } as unknown as PaginatedResponse<{
      id: string;
    }>;
    const normalized = normalizePaginatedListResponse(malformed, 1, 20);
    expect(normalized.items).toEqual([]);
  });
});

describe("fetchListItems", () => {
  beforeEach(() => {
    api.mockReset();
  });

  it("bypasses cached list responses when requested", async () => {
    const cacheKey = buildListCacheKey("/tasks", "ws-1", { projectId: "p-1" }, 100);
    setCachedListItems(cacheKey, [{ id: "stale" }]);
    api.mockResolvedValue({
      items: [{ id: "fresh" }],
      page: 1,
      limit: 100,
      total: 1,
      totalPages: 1
    });

    const items = await fetchListItems<{ id: string }>("/tasks", {
      workspaceId: "ws-1",
      filters: { projectId: "p-1" },
      bypassCache: true
    });

    expect(items).toEqual([{ id: "fresh" }]);
    expect(api).toHaveBeenCalledTimes(1);
  });
});
