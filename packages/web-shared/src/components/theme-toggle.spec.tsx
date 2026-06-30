/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

vi.mock("../api/client", () => ({
  api: vi.fn().mockResolvedValue({})
}));

vi.mock("../stores/session.store", () => ({
  useSessionStore: (selector: (state: { session: null }) => unknown) => selector({ session: null }),
  getWorkspaceId: () => null
}));

function renderWithTheme(ui: ReactNode) {
  return render(<ThemeProvider attribute="class">{ui}</ThemeProvider>);
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false
      })
    });
  });

  it("opens a compact appearance menu in icon-menu variant", async () => {
    renderWithTheme(<ThemeToggle variant="icon-menu" />);

    const trigger = await screen.findByRole("button", { name: "Appearance" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Appearance" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /Light/i })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /Dark/i })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /System/i })).toBeTruthy();
  });
});
