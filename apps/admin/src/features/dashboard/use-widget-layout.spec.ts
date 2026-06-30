import { describe, expect, it } from "vitest";
import { useWidgetLayout } from "./use-widget-layout";

describe("useWidgetLayout", () => {
  it("exposes dashboard layout store actions", () => {
    const state = useWidgetLayout.getState();
    expect(state.initialized).toBe(false);
    expect(typeof state.initialize).toBe("function");
    expect(typeof state.persistLayout).toBe("function");
    expect(typeof state.updateLayout).toBe("function");
  });
});
