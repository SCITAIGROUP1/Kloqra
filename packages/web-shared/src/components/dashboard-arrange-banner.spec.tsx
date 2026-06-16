import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardArrangeBanner } from "./dashboard-arrange-banner";

describe("DashboardArrangeBanner", () => {
  it("calls cancel and reset handlers", () => {
    const onCancel = vi.fn();
    const onResetLayout = vi.fn();

    render(
      <DashboardArrangeBanner
        onCancel={onCancel}
        onResetLayout={onResetLayout}
        onDone={vi.fn()}
        onSaveAsDefault={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset layout/i }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onResetLayout).toHaveBeenCalledOnce();
  });

  it("saves layout from the primary save button", () => {
    const onDone = vi.fn();

    render(
      <DashboardArrangeBanner
        onCancel={vi.fn()}
        onResetLayout={vi.fn()}
        onDone={onDone}
        onSaveAsDefault={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onDone).toHaveBeenCalledOnce();
  });

  it("offers save options in the dropdown menu", () => {
    const onDone = vi.fn();
    const onSaveAsDefault = vi.fn();

    render(
      <DashboardArrangeBanner
        onCancel={vi.fn()}
        onResetLayout={vi.fn()}
        onDone={onDone}
        onSaveAsDefault={onSaveAsDefault}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /save layout/i }));
    expect(onDone).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /save options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /save as default/i }));
    expect(onSaveAsDefault).toHaveBeenCalledOnce();
  });
});
