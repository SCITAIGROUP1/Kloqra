import type { WidgetLayoutItemDto } from "@kloqra/contracts";

export type DashboardBreakpoint = "lg" | "md" | "sm" | "xs" | "xxs";

export const DASHBOARD_GRID_BREAKPOINTS: Record<DashboardBreakpoint, number> = {
  lg: 1080,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0
};

export const DASHBOARD_GRID_COLS: Record<DashboardBreakpoint, number> = {
  lg: 12,
  /** Match lg so sidebar open/close does not switch column counts or reflow algorithm. */
  md: 12,
  sm: 6,
  xs: 4,
  xxs: 2
};

/** Column count used when persisting a user-arranged layout (desktop grid). */
export const DASHBOARD_PERSIST_COLS = DASHBOARD_GRID_COLS.lg;

export function isPersistableDashboardBreakpoint(
  breakpoint: DashboardBreakpoint,
  colsByBreakpoint: Record<DashboardBreakpoint, number> = DASHBOARD_GRID_COLS
): boolean {
  return colsByBreakpoint[breakpoint] === DASHBOARD_PERSIST_COLS;
}

export type DashboardGridLayouts = Record<DashboardBreakpoint, WidgetLayoutItemDto[]>;

export type WidgetMinSize = { w: number; h: number };

function sortByPosition(items: WidgetLayoutItemDto[]): WidgetLayoutItemDto[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

function clampWidth(
  item: WidgetLayoutItemDto,
  cols: number,
  minSizes?: Record<string, WidgetMinSize>
): number {
  const minW = Math.min(minSizes?.[item.i]?.w ?? 1, cols);
  return Math.min(Math.max(item.w, minW), cols);
}

/** Full-width vertical stack (xs / xxs). */
function stackLayout(
  items: WidgetLayoutItemDto[],
  cols: number,
  _minSizes?: Record<string, WidgetMinSize>
): WidgetLayoutItemDto[] {
  let y = 0;
  return sortByPosition(items).map((item) => {
    const w = cols;
    const placed = { ...item, x: 0, y, w };
    y += item.h;
    return placed;
  });
}

/** Clamp widths and reflow into rows (md / sm). */
function clampAndReflow(
  items: WidgetLayoutItemDto[],
  cols: number,
  minSizes?: Record<string, WidgetMinSize>
): WidgetLayoutItemDto[] {
  const result: WidgetLayoutItemDto[] = [];
  let currentY = 0;
  let currentX = 0;
  let rowMaxH = 0;

  for (const item of sortByPosition(items)) {
    let w = clampWidth(item, cols, minSizes);

    if (currentX > 0 && currentX + w > cols) {
      currentY += rowMaxH;
      currentX = 0;
      rowMaxH = 0;
    }

    if (w > cols) {
      w = cols;
    }

    result.push({ ...item, x: currentX, y: currentY, w });
    rowMaxH = Math.max(rowMaxH, item.h);
    currentX += w;

    if (currentX >= cols) {
      currentY += rowMaxH;
      currentX = 0;
      rowMaxH = 0;
    }
  }

  return result;
}

export function buildWidgetMinSizeMap(
  registry: Array<{ id: string; minSize: WidgetMinSize }>
): Record<string, WidgetMinSize> {
  return Object.fromEntries(registry.map((w) => [w.id, w.minSize]));
}

export function generateResponsiveLayouts(
  items: WidgetLayoutItemDto[],
  colsByBreakpoint: Record<DashboardBreakpoint, number> = DASHBOARD_GRID_COLS,
  minSizes?: Record<string, WidgetMinSize>
): DashboardGridLayouts {
  const visible = items.filter((item) => item.visible !== false);

  return {
    lg: visible,
    /** Same coordinates as lg — only pixel column width changes when the shell resizes. */
    md: visible,
    sm: clampAndReflow(visible, colsByBreakpoint.sm, minSizes),
    xs: stackLayout(visible, colsByBreakpoint.xs, minSizes),
    xxs: stackLayout(visible, colsByBreakpoint.xxs, minSizes)
  };
}
