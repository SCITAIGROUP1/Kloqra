import { describe, expect, it } from "vitest";
import { formatWidgetGroupTabLabel } from "./widget-group-label";
import { WIDGET_GROUPS } from "./widget-registry";

describe("formatWidgetGroupTabLabel", () => {
  it("shortens workflow group to Quick", () => {
    const workflow = WIDGET_GROUPS.find((group) => group.value === "workflow");
    expect(workflow?.label).toBe("Quick Actions & Workflows");
    expect(formatWidgetGroupTabLabel(workflow!.label)).toBe("Quick");
  });
});
