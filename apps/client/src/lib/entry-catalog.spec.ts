import { ROUTES } from "@kloqra/contracts";
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEntryCatalog, refreshEntryCatalog } from "./entry-catalog";

const mockFetchListItems = vi.fn();
const mockSetTasks = vi.fn();
const mockSetProjects = vi.fn();

vi.mock("@kloqra/web-shared", () => ({
  fetchListItems: (...args: unknown[]) => mockFetchListItems(...args)
}));

vi.mock("@/stores/projects.store", () => ({
  useProjectsStore: {
    getState: () => ({
      setTasks: mockSetTasks,
      setProjects: mockSetProjects
    })
  }
}));

describe("entry-catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const task = { id: "t1" } as TaskDto;
    const project = { id: "p1" } as ProjectDto;
    const category = { id: "c1" } as CategoryDto;
    mockFetchListItems.mockImplementation((route: string) => {
      if (route === ROUTES.TASKS.LIST) return Promise.resolve([task]);
      if (route === ROUTES.PROJECTS.LIST) return Promise.resolve([project]);
      if (route === ROUTES.CATEGORIES.LIST) return Promise.resolve([category]);
      return Promise.resolve([]);
    });
  });

  it("loadEntryCatalog fetches with bypassCache", async () => {
    const data = await loadEntryCatalog("ws-1");

    expect(mockFetchListItems).toHaveBeenCalledTimes(3);
    expect(mockFetchListItems).toHaveBeenCalledWith(ROUTES.TASKS.LIST, {
      workspaceId: "ws-1",
      bypassCache: true
    });
    expect(data.tasks).toEqual([{ id: "t1" }]);
    expect(data.projects).toEqual([{ id: "p1" }]);
    expect(data.categories).toEqual([{ id: "c1" }]);
  });

  it("refreshEntryCatalog updates the projects store", async () => {
    const data = await refreshEntryCatalog("ws-1");

    expect(mockSetTasks).toHaveBeenCalledWith([{ id: "t1" }]);
    expect(mockSetProjects).toHaveBeenCalledWith([{ id: "p1" }]);
    expect(data.categories).toEqual([{ id: "c1" }]);
  });
});
