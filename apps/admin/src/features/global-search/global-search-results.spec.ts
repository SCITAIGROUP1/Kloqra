import { describe, expect, it } from "vitest";
import {
  mapCategoryResults,
  mapPeopleResults,
  mapProjectResults,
  mapTaskResults
} from "./global-search-results";

describe("global-search-results", () => {
  it("maps projects to overview links", () => {
    const { results } = mapProjectResults(
      [
        {
          id: "p1",
          name: "Annual Audit",
          color: "#236bfe",
          clientName: "Adventure Works",
          isActive: true
        }
      ],
      1,
      "audit"
    );

    expect(results[0]).toEqual({
      id: "project:p1",
      type: "project",
      label: "Annual Audit",
      subtitle: "Adventure Works",
      href: "/projects/p1/overview"
    });
  });

  it("maps tasks to project tasks tab", () => {
    const { results } = mapTaskResults(
      [
        {
          id: "t1",
          projectId: "p1",
          categoryId: "c1",
          categoryName: "Development",
          taskName: "Code review",
          billableDefault: true
        }
      ],
      1,
      "code"
    );

    expect(results[0]?.href).toBe("/projects/p1/tasks");
  });

  it("omits tasks without projectId", () => {
    const { results } = mapTaskResults(
      [
        {
          id: "t1",
          projectId: "",
          categoryId: "c1",
          taskName: "Orphan",
          billableDefault: true
        }
      ],
      1,
      "orphan"
    );

    expect(results).toHaveLength(0);
  });

  it("adds view-all links when total exceeds five", () => {
    const { viewAll } = mapCategoryResults(
      Array.from({ length: 5 }, (_, index) => ({
        id: `c${index}`,
        name: `Category ${index}`,
        description: null
      })),
      8,
      "category"
    );

    expect(viewAll).toEqual({
      type: "category",
      label: "View all in Categories",
      href: "/categories?search=category"
    });
  });

  it("maps people to team management", () => {
    const { results } = mapPeopleResults(
      [
        {
          id: "m1",
          userId: "u1",
          userName: "Alex Admin",
          userEmail: "alex@example.com",
          role: "ADMIN",
          isActive: true,
          status: "active",
          projectCount: 2,
          weekHours: 10,
          lastActiveAt: null,
          isTrackingNow: false
        }
      ],
      1,
      "alex"
    );

    expect(results[0]?.href).toBe("/team-management");
  });
});
