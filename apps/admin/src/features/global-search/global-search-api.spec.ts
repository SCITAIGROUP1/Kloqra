import { ROUTES } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGlobalSearchEntities } from "./global-search-api";

const fetchPaginatedList = vi.fn();
const api = vi.fn();

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchPaginatedList: (...args: unknown[]) => fetchPaginatedList(...args)
  } as any;
});

vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => api(...args)
}));

describe("fetchGlobalSearchEntities", () => {
  beforeEach(() => {
    fetchPaginatedList.mockReset();
    api.mockReset();
  });

  it("returns empty groups for short queries", async () => {
    const results = await fetchGlobalSearchEntities("ws-1", "a");
    expect(results.projects.results).toEqual([]);
    expect(fetchPaginatedList).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });

  it("fans out to all entity endpoints", async () => {
    fetchPaginatedList.mockImplementation((path: string) => {
      if (path === ROUTES.PROJECTS.LIST) {
        return Promise.resolve({ items: [], total: 0 });
      }
      if (path === ROUTES.TASKS.LIST) {
        return Promise.resolve({ items: [], total: 0 });
      }
      if (path === ROUTES.CATEGORIES.LIST) {
        return Promise.resolve({ items: [], total: 0 });
      }
      return Promise.resolve({ items: [], total: 0 });
    });
    api.mockResolvedValue({ members: [], total: 0, summary: {}, page: 1, limit: 5, totalPages: 0 });

    await fetchGlobalSearchEntities("ws-1", "alpha");

    expect(fetchPaginatedList).toHaveBeenCalledTimes(3);
    expect(fetchPaginatedList).toHaveBeenCalledWith(
      ROUTES.PROJECTS.LIST,
      expect.objectContaining({ workspaceId: "ws-1", search: "alpha", limit: 5 })
    );
    expect(api).toHaveBeenCalledWith(
      expect.stringContaining(ROUTES.WORKSPACES.MEMBERS_OVERVIEW("ws-1")),
      expect.objectContaining({ workspaceId: "ws-1" })
    );
  });

  it("keeps successful groups when another call fails", async () => {
    fetchPaginatedList.mockImplementation((path: string) => {
      if (path === ROUTES.PROJECTS.LIST) {
        return Promise.resolve({
          items: [
            {
              id: "p1",
              name: "Alpha Project",
              color: "#236bfe",
              clientName: null,
              isActive: true
            }
          ],
          total: 1
        });
      }
      if (path === ROUTES.TASKS.LIST) {
        return Promise.reject(new Error("tasks failed"));
      }
      return Promise.resolve({ items: [], total: 0 });
    });
    api.mockResolvedValue({ members: [], total: 0, summary: {}, page: 1, limit: 5, totalPages: 0 });

    const results = await fetchGlobalSearchEntities("ws-1", "alpha");

    expect(results.projects.results[0]?.label).toBe("Alpha Project");
    expect(results.tasks.error).toBe("Could not load results.");
  });
});
