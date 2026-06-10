import { describe, expect, it } from "vitest";
import {
  blockStyle,
  buildDayOccupancySegments,
  combineDayAndTimeInZone,
  computeLogMoveRange,
  fromDateKey,
  isSlotOccupiedElsewhere,
  rangeOccupiedElsewhere,
  slotIntervalForIndex,
  toDateKey
} from "./calendar-utils";

describe("computeLogMoveRange", () => {
  it("shifts by one hour on the same day without drift", () => {
    const log = {
      startTime: "2026-06-08T11:30:00.000Z",
      endTime: "2026-06-08T14:30:00.000Z"
    };
    const anchor = combineDayAndTimeInZone("2026-06-08", "17:00", "Asia/Colombo");
    const preview = combineDayAndTimeInZone("2026-06-08", "18:00", "Asia/Colombo");

    const moved = computeLogMoveRange(log, anchor, preview, "Asia/Colombo");

    expect(moved.start.toISOString()).toBe("2026-06-08T12:30:00.000Z");
    expect(moved.end.toISOString()).toBe("2026-06-08T15:30:00.000Z");
  });

  it("snaps drag targets to the nearest 30-minute slot", () => {
    const log = {
      startTime: "2026-06-08T11:30:00.000Z",
      endTime: "2026-06-08T14:30:00.000Z"
    };
    const anchor = combineDayAndTimeInZone("2026-06-08", "17:00", "Asia/Colombo");
    const preview = combineDayAndTimeInZone("2026-06-08", "18:15", "Asia/Colombo");

    const moved = computeLogMoveRange(log, anchor, preview, "Asia/Colombo");
    const durationMs = moved.end.getTime() - moved.start.getTime();

    expect(durationMs).toBe(3 * 60 * 60 * 1000);
    expect(moved.start.toISOString()).toBe("2026-06-08T13:00:00.000Z");
  });
});

describe("occupancy segments", () => {
  const dateKey = "2026-06-08";

  const occupancy = [
    {
      id: "a",
      startTime: "2026-06-08T09:00:00.000Z",
      endTime: "2026-06-08T10:00:00.000Z",
      workspaceId: "ws-other",
      workspaceName: "Other Co",
      label: "Project — Task"
    },
    {
      id: "b",
      startTime: "2026-06-08T11:00:00.000Z",
      endTime: "2026-06-08T12:00:00.000Z",
      workspaceId: "ws-current",
      workspaceName: "Current",
      label: "Local — Task"
    }
  ];

  it("buildDayOccupancySegments excludes current workspace", () => {
    const segments = buildDayOccupancySegments(dateKey, occupancy, "UTC", "ws-current");
    expect(segments).toHaveLength(1);
    expect(segments[0]?.workspaceId).toBe("ws-other");
  });

  it("isSlotOccupiedElsewhere detects overlap on elsewhere segment", () => {
    const segments = buildDayOccupancySegments(dateKey, occupancy, "UTC", "ws-current");
    const { start, end } = slotIntervalForIndex(dateKey, 18, "UTC");
    const conflict = isSlotOccupiedElsewhere(start, end, segments);
    expect(conflict?.id).toBe("a");
  });

  it("rangeOccupiedElsewhere respects exclude id when moving", () => {
    const segments = buildDayOccupancySegments(dateKey, occupancy, "UTC", "ws-current");
    const conflict = rangeOccupiedElsewhere(dateKey, 18, 18, segments, "UTC", "a");
    expect(conflict).toBeUndefined();
  });

  it("places cross-workspace logs at local wall time, not UTC clock", () => {
    const acmeElsewhere = buildDayOccupancySegments(
      "2026-06-09",
      [
        {
          id: "nw-1",
          startTime: "2026-06-09T15:05:00.000Z",
          endTime: "2026-06-09T18:50:00.000Z",
          workspaceId: "ws-acme",
          workspaceName: "Acme Corporation",
          label: "Client Portal — QA pass"
        }
      ],
      "America/New_York",
      "ws-meridian"
    );
    expect(acmeElsewhere).toHaveLength(1);
    const style = blockStyle(acmeElsewhere[0]!.start, acmeElsewhere[0]!.end, "America/New_York");
    const topPct = parseFloat(style.top);
    expect(topPct).toBeGreaterThan(40);
    expect(topPct).toBeLessThan(55);
  });
});

describe("blockStyle proportional height", () => {
  it("uses true duration for short entries instead of a 20-minute floor", () => {
    const start = combineDayAndTimeInZone("2026-06-08", "09:00", "UTC");
    const end = combineDayAndTimeInZone("2026-06-08", "09:05", "UTC");
    const style = blockStyle(start, end, "UTC");
    const heightPct = parseFloat(style.height);
    expect(heightPct).toBeGreaterThan(0);
    expect(heightPct).toBeLessThan(1);
  });
});

describe("toDateKey / fromDateKey", () => {
  it("formats local calendar dates as YYYY-MM-DD", () => {
    expect(toDateKey(new Date(2025, 5, 9))).toBe("2025-06-09");
    expect(toDateKey(new Date(2025, 0, 5))).toBe("2025-01-05");
  });

  it("round-trips through fromDateKey at local midnight", () => {
    const key = "2025-06-09";
    const day = fromDateKey(key);
    expect(toDateKey(day)).toBe(key);
    expect(day.getHours()).toBe(0);
    expect(day.getMinutes()).toBe(0);
  });
});
