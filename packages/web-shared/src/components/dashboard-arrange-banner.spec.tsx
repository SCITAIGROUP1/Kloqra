import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardArrangeBanner } from "./dashboard-arrange-banner";

describe("DashboardArrangeBanner", () => {
  it("calls layout action handlers", () => {
    const onResetLayout = vi.fn();
    const onDone = vi.fn();
    const onSaveAsDefault = vi.fn();

    render(
      <DashboardArrangeBanner
        editModeLabel="Edit Mode"
        onResetLayout={onResetLayout}
        onDone={onDone}
        onSaveAsDefault={onSaveAsDefault}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /reset layout/i }));
    fireEvent.click(screen.getByRole("button", { name: /^done$/i }));
    fireEvent.click(screen.getByRole("button", { name: /save as default/i }));

    expect(onResetLayout).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledOnce();
    expect(onSaveAsDefault).toHaveBeenCalledOnce();
  });
});
