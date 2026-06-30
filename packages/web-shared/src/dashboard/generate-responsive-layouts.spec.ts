import type { WidgetLayoutItemDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_GRID_COLS,
  generateResponsiveLayouts,
  isPersistableDashboardBreakpoint,
  type WidgetMinSize
} from "./generate-responsive-layouts";

const SAMPLE_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "stat_total_hours", x: 0, y: 0, w: 4, h: 2, visible: true },
  { i: "stat_billable", x: 4, y: 0, w: 4, h: 2, visible: true },
  { i: "stat_projects", x: 8, y: 0, w: 4, h: 2, visible: true },
  { i: "quick_timer", x: 0, y: 2, w: 6, h: 3, visible: true },
  { i: "weekly_progress", x: 6, y: 2, w: 6, h: 3, visible: true },
  { i: "hidden_widget", x: 0, y: 99, w: 3, h: 2, visible: false }
];

const MIN_SIZES: Record<string, WidgetMinSize> = {
  stat_total_hours: { w: 3, h: 2 },
  quick_timer: { w: 4, h: 3 }
};

describe("generateResponsiveLayouts", () => {
  it("returns lg layout for visible items only", () => {
    const visible = SAMPLE_LAYOUT.filter((item) => item.visible);
    const layouts = generateResponsiveLayouts(SAMPLE_LAYOUT, DASHBOARD_GRID_COLS, MIN_SIZES);
    expect(layouts.lg).toEqual(visible);
    expect(layouts.md).toEqual(visible);
  });

  it("uses the same stored coordinates for md and lg (stable when shell width changes)", () => {
    const layouts = generateResponsiveLayouts(SAMPLE_LAYOUT, DASHBOARD_GRID_COLS, MIN_SIZES);
    expect(layouts.md).toEqual(layouts.lg);
    expect(DASHBOARD_GRID_COLS.md).toBe(DASHBOARD_GRID_COLS.lg);
  });

  it("treats md and lg as persistable desktop breakpoints", () => {
    expect(isPersistableDashboardBreakpoint("lg")).toBe(true);
    expect(isPersistableDashboardBreakpoint("md")).toBe(true);
    expect(isPersistableDashboardBreakpoint("sm")).toBe(false);
  });

  it("keeps every item within column bounds at each breakpoint", () => {
    const layouts = generateResponsiveLayouts(SAMPLE_LAYOUT, DASHBOARD_GRID_COLS, MIN_SIZES);

    for (const [breakpoint, cols] of Object.entries(DASHBOARD_GRID_COLS)) {
      const layout = layouts[breakpoint as keyof typeof layouts];
      for (const item of layout) {
        expect(item.x + item.w).toBeLessThanOrEqual(cols);
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.w).toBeGreaterThan(0);
      }
    }
  });

  it("stacks items full-width on xxs", () => {
    const layouts = generateResponsiveLayouts(SAMPLE_LAYOUT, DASHBOARD_GRID_COLS, MIN_SIZES);
    const cols = DASHBOARD_GRID_COLS.xxs;

    for (const item of layouts.xxs) {
      expect(item.x).toBe(0);
      expect(item.w).toBe(cols);
    }

    for (let i = 1; i < layouts.xxs.length; i++) {
      const prev = layouts.xxs[i - 1]!;
      const curr = layouts.xxs[i]!;
      expect(curr.y).toBeGreaterThanOrEqual(prev.y + prev.h);
    }
  });

  it("stacks items full-width on xs", () => {
    const layouts = generateResponsiveLayouts(SAMPLE_LAYOUT, DASHBOARD_GRID_COLS, MIN_SIZES);
    const cols = DASHBOARD_GRID_COLS.xs;

    for (const item of layouts.xs) {
      expect(item.x).toBe(0);
      expect(item.w).toBe(cols);
    }
  });

  it("does not overlap items within a breakpoint layout", () => {
    const layouts = generateResponsiveLayouts(SAMPLE_LAYOUT, DASHBOARD_GRID_COLS, MIN_SIZES);

    for (const layout of Object.values(layouts)) {
      for (let i = 0; i < layout.length; i++) {
        for (let j = i + 1; j < layout.length; j++) {
          const a = layout[i]!;
          const b = layout[j]!;
          const overlapsX = a.x < b.x + b.w && b.x < a.x + a.w;
          const overlapsY = a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlapsX && overlapsY).toBe(false);
        }
      }
    }
  });
});
