/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { Monitor } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { SettingsNav } from "./settings-nav";

describe("SettingsNav", () => {
  it("renders items and calls onChange", () => {
    const onChange = vi.fn();

    render(
      <SettingsNav
        items={[{ id: "appearance", label: "Appearance", icon: Monitor }]}
        active="appearance"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("navigation", { name: "Settings" })).toBeTruthy();
    expect(screen.getByText("Appearance")).toBeTruthy();
    fireEvent.click(screen.getByText("Appearance"));
    expect(onChange).toHaveBeenCalledWith("appearance");
  });
});
