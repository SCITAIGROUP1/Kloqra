import { describe, expect, it, vi } from "vitest";
import { ExportRowsBuilder } from "./export-rows.builder";
import type { ExportRowContext } from "./export-rows.builder";

function baseCtx(overrides: Partial<ExportRowContext> = {}): ExportRowContext {
  return {
    workspaceId: "ws-1",
    workspaceName: "Acme",
    workspaceSlug: "acme",
    settings: { weekStart: "monday", expectedWeeklyHours: 40 },
    filters: {},
    from: new Date("2025-06-02T00:00:00.000Z"),
    to: new Date("2025-06-06T23:59:59.000Z"),
    logs: [],
    aggregates: {
      daily: new Map(),
      byProject: new Map(),
      byUser: new Map(),
      byCategory: new Map(),
      workspaceAgg: { totalHours: 0, billableHours: 0, billableAmount: 0 }
    },
    resolveRate: () => 100,
    ...overrides
  };
}

describe("ExportRowsBuilder", () => {
  const prisma = {
    workspaceMember: { findMany: vi.fn() },
    timeLog: { findMany: vi.fn() },
    project: { findMany: vi.fn() },
    timesheetPeriod: { findMany: vi.fn() }
  };
  const aggregation = {
    teamMemberUserIds: vi.fn(),
    fetchLogs: vi.fn(),
    resolveRateMaps: vi.fn(),
    buildAggregates: vi.fn()
  };
  const builder = new ExportRowsBuilder(prisma as never, aggregation as never);

  it("builds member daily totals from daily aggregates", async () => {
    const dayMap = new Map([
      [
        "proj-key",
        {
          userName: "Alex",
          userEmail: "alex@acme.com",
          projectName: "P1",
          clientName: "Client",
          totalHours: 4,
          billableHours: 3,
          billableAmount: 300
        }
      ]
    ]);
    const daily = new Map([["2025-06-02", dayMap]]);

    const rows = await builder.buildRows(
      "member_daily_total",
      baseCtx({
        aggregates: {
          ...baseCtx().aggregates,
          daily
        }
      })
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2025-06-02",
      member: "Alex",
      total_hours: 4
    });
  });

  it("builds hours by source from logs", async () => {
    const rows = await builder.buildRows(
      "hours_by_source",
      baseCtx({
        logs: [
          {
            userId: "u1",
            durationSec: 3600,
            source: "timer",
            isBillable: true,
            startTime: new Date("2025-06-02T09:00:00.000Z"),
            endTime: new Date("2025-06-02T10:00:00.000Z"),
            user: { name: "Alex", email: "alex@acme.com", defaultHourlyRate: null },
            task: {
              projectId: "p1",
              taskName: "T",
              categoryId: "c1",
              category: { id: "c1", name: "Dev" },
              project: { id: "p1", name: "P1", clientName: null }
            }
          },
          {
            userId: "u1",
            durationSec: 7200,
            source: "manual",
            isBillable: true,
            startTime: new Date("2025-06-03T09:00:00.000Z"),
            endTime: new Date("2025-06-03T11:00:00.000Z"),
            user: { name: "Alex", email: "alex@acme.com", defaultHourlyRate: null },
            task: {
              projectId: "p1",
              taskName: "T2",
              categoryId: "c1",
              category: { id: "c1", name: "Dev" },
              project: { id: "p1", name: "P1", clientName: null }
            }
          }
        ] as ExportRowContext["logs"]
      })
    );

    expect(rows[0]).toMatchObject({
      member: "Alex",
      timer_hours: 1,
      manual_hours: 2,
      total_hours: 3
    });
  });

  it("formats time_entries start and end as clock time only", async () => {
    const rows = await builder.buildRows(
      "time_entries",
      baseCtx({
        logs: [
          {
            userId: "u1",
            durationSec: 3600,
            source: "timer",
            isBillable: true,
            startTime: new Date("2025-06-02T08:28:00.000Z"),
            endTime: new Date("2025-06-02T09:45:00.000Z"),
            description: "Work",
            user: { name: "Alex", email: "alex@acme.com", defaultHourlyRate: null },
            task: {
              projectId: "p1",
              taskName: "T",
              categoryId: "c1",
              category: { id: "c1", name: "Dev" },
              project: { id: "p1", name: "P1", clientName: "Client" }
            }
          }
        ] as ExportRowContext["logs"]
      })
    );

    expect(rows[0]).toMatchObject({
      date: "2025-06-02",
      start_time: "08:28",
      end_time: "09:45"
    });
    expect(rows[0].start_time).not.toContain("T");
    expect(rows[0].end_time).not.toContain("T");
  });
});
