import { describe, expect, it } from "vitest";
import { buildTimeTrackerLogsQuery, TIME_TRACKER_PAGE_SIZE } from "./time-tracker-logs-query";

describe("buildTimeTrackerLogsQuery", () => {
  const from = new Date("2026-06-01T00:00:00.000Z");
  const to = new Date("2026-07-01T00:00:00.000Z");

  it("includes period and default page size", () => {
    const url = buildTimeTrackerLogsQuery({ from, to });
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("from")).toBe(from.toISOString());
    expect(params.get("to")).toBe(to.toISOString());
    expect(params.get("limit")).toBe(String(TIME_TRACKER_PAGE_SIZE));
  });

  it("includes project, category, task, and cursor filters", () => {
    const url = buildTimeTrackerLogsQuery({
      from,
      to,
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      categoryId: "550e8400-e29b-41d4-a716-446655440001",
      taskId: "550e8400-e29b-41d4-a716-446655440002",
      cursor: "550e8400-e29b-41d4-a716-446655440003"
    });
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("projectId")).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(params.get("categoryId")).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(params.get("taskId")).toBe("550e8400-e29b-41d4-a716-446655440002");
    expect(params.get("cursor")).toBe("550e8400-e29b-41d4-a716-446655440003");
  });

  it("includes search and billableOnly filters", () => {
    const url = buildTimeTrackerLogsQuery({
      from,
      to,
      search: "audit",
      billableOnly: true
    });
    const params = new URL(url, "http://localhost").searchParams;
    expect(params.get("search")).toBe("audit");
    expect(params.get("billableOnly")).toBe("true");
  });
});
