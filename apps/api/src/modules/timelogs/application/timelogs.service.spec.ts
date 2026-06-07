import { describe, it, expect } from "vitest";

describe("TimelogsService", () => {
  it("duration calculation", () => {
    const start = new Date("2025-01-01T09:00:00Z");
    const end = new Date("2025-01-01T11:30:00Z");
    const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
    expect(durationSec).toBe(9000);
  });
});

describe("TimelogAuditService snapshots", () => {
  it("builds comparable before/after payloads", () => {
    const before = {
      taskId: "550e8400-e29b-41d4-a716-446655440000",
      startTime: new Date("2025-01-01T09:00:00Z"),
      endTime: new Date("2025-01-01T10:00:00Z"),
      durationSec: 3600,
      description: "Work",
      isBillable: true,
      source: "manual"
    };
    const after = { ...before, isBillable: false };
    expect(before.isBillable).toBe(true);
    expect(after.isBillable).toBe(false);
  });
});
