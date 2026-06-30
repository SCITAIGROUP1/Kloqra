import { describe, expect, it } from "vitest";
import type { OccupancyItem } from "./validate-time-entry-overlap";
import { overlapMessageFromItems } from "./validate-time-entry-overlap";

const sampleItem: OccupancyItem = {
  id: "other",
  startTime: "2026-06-09T12:00:00.000Z",
  endTime: "2026-06-09T13:00:00.000Z",
  source: "manual",
  workspaceId: "ws-1",
  workspaceName: "Acme",
  label: "Design",
  isLocked: false
};

describe("overlapMessageFromItems", () => {
  it("returns null when no overlap", () => {
    const msg = overlapMessageFromItems(
      [sampleItem],
      new Date("2026-06-09T09:00:00.000Z"),
      new Date("2026-06-09T10:00:00.000Z"),
      "UTC"
    );
    expect(msg).toBeNull();
  });

  it("returns a message when intervals overlap", () => {
    const msg = overlapMessageFromItems(
      [
        {
          ...sampleItem,
          startTime: "2026-06-09T09:30:00.000Z",
          endTime: "2026-06-09T10:30:00.000Z"
        }
      ],
      new Date("2026-06-09T09:00:00.000Z"),
      new Date("2026-06-09T10:00:00.000Z"),
      "UTC"
    );
    expect(msg).toMatch(/Acme/i);
    expect(msg).toMatch(/Design/i);
  });

  it("excludes the entry being edited", () => {
    const msg = overlapMessageFromItems(
      [
        {
          ...sampleItem,
          id: "log-1",
          startTime: "2026-06-09T09:00:00.000Z",
          endTime: "2026-06-09T10:00:00.000Z"
        }
      ],
      new Date("2026-06-09T09:00:00.000Z"),
      new Date("2026-06-09T10:00:00.000Z"),
      "UTC",
      "log-1"
    );
    expect(msg).toBeNull();
  });
});
