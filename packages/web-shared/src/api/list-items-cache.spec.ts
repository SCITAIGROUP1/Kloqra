import { beforeEach, describe, expect, it } from "vitest";
import {
  buildListCacheKey,
  getCachedListItems,
  invalidateListItemsCache,
  setCachedListItems
} from "./list-items-cache";

describe("list-items-cache", () => {
  beforeEach(() => {
    invalidateListItemsCache();
  });

  it("stores and returns cached list items before expiry", () => {
    const key = buildListCacheKey("/tasks", "ws-1", { projectId: "p-1" }, 100);
    setCachedListItems(key, [{ id: "t-1" }]);

    expect(getCachedListItems(key)).toEqual([{ id: "t-1" }]);
  });

  it("invalidates all entries for a workspace", () => {
    const tasksKey = buildListCacheKey("/tasks", "ws-1", undefined, 100);
    const projectsKey = buildListCacheKey("/projects", "ws-1", undefined, 100);
    const otherWorkspaceKey = buildListCacheKey("/tasks", "ws-2", undefined, 100);

    setCachedListItems(tasksKey, [{ id: "t-1" }]);
    setCachedListItems(projectsKey, [{ id: "p-1" }]);
    setCachedListItems(otherWorkspaceKey, [{ id: "t-2" }]);

    invalidateListItemsCache({ workspaceId: "ws-1" });

    expect(getCachedListItems(tasksKey)).toBeNull();
    expect(getCachedListItems(projectsKey)).toBeNull();
    expect(getCachedListItems(otherWorkspaceKey)).toEqual([{ id: "t-2" }]);
  });

  it("invalidates entries for a specific list path", () => {
    const tasksKey = buildListCacheKey("/tasks", "ws-1", undefined, 100);
    const projectsKey = buildListCacheKey("/projects", "ws-1", undefined, 100);

    setCachedListItems(tasksKey, [{ id: "t-1" }]);
    setCachedListItems(projectsKey, [{ id: "p-1" }]);

    invalidateListItemsCache({ path: "/tasks" });

    expect(getCachedListItems(tasksKey)).toBeNull();
    expect(getCachedListItems(projectsKey)).toEqual([{ id: "p-1" }]);
  });
});
