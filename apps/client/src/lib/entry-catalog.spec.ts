import { ROUTES } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEntryCatalog, refreshEntryCatalog } from "./entry-catalog";

const workspaceId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  setProjects: vi.fn(),
  setTasks: vi.fn(),
  setCategories: vi.fn(),
  fetchListItems: vi.fn()
}));

vi.mock("@/stores/projects.store", () => ({
  useProjectsStore: {
    getState: () => ({
      setProjects: mocks.setProjects,
      setTasks: mocks.setTasks,
      setCategories: mocks.setCategories
    })
  }
}));

vi.mock("@kloqra/web-shared", () => ({
  fetchListItems: mocks.fetchListItems
}));

describe("entry-catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchListItems.mockImplementation((route: string) => {
      if (route === ROUTES.PROJECTS.LIST) return Promise.resolve([{ id: "p1" }]);
      if (route === ROUTES.TASKS.LIST) return Promise.resolve([{ id: "t1" }]);
      if (route === ROUTES.CATEGORIES.LIST) return Promise.resolve([{ id: "c1" }]);
      return Promise.resolve([]);
    });
  });

  it("loadEntryCatalog fetches full catalog with bypassCache", async () => {
    const catalog = await loadEntryCatalog(workspaceId);

    expect(mocks.fetchListItems).toHaveBeenCalledWith(ROUTES.PROJECTS.LIST, {
      workspaceId,
      bypassCache: true
    });
    expect(mocks.fetchListItems).toHaveBeenCalledWith(ROUTES.TASKS.LIST, {
      workspaceId,
      bypassCache: true
    });
    expect(mocks.fetchListItems).toHaveBeenCalledWith(ROUTES.CATEGORIES.LIST, {
      workspaceId,
      bypassCache: true
    });
    expect(catalog).toEqual({
      projects: [{ id: "p1" }],
      tasks: [{ id: "t1" }],
      categories: [{ id: "c1" }]
    });
  });

  it("refreshEntryCatalog updates the projects store", async () => {
    const catalog = await refreshEntryCatalog(workspaceId);

    expect(mocks.setProjects).toHaveBeenCalledWith([{ id: "p1" }]);
    expect(mocks.setTasks).toHaveBeenCalledWith([{ id: "t1" }]);
    expect(mocks.setCategories).toHaveBeenCalledWith([{ id: "c1" }]);
    expect(catalog.projects).toEqual([{ id: "p1" }]);
  });
});
