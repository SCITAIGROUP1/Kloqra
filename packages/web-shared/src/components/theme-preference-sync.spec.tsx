/** @vitest-environment jsdom */
import { render, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemePreferenceSync } from "./theme-preference-sync";

const mockApi = vi.fn();
const mockUseSessionStore = vi.fn();

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

vi.mock("../stores/session.store", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => mockUseSessionStore(selector),
  getWorkspaceId: () => "ws-1"
}));

function renderSync(session: { user: { id: string }; workspaceId: string } | null) {
  mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({ session })
  );

  return render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="kloqra-theme-test"
    >
      <ThemePreferenceSync />
    </ThemeProvider>
  );
}

describe("ThemePreferenceSync", () => {
  beforeEach(() => {
    mockApi.mockReset();
    localStorage.clear();
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

  it("hydrates theme from the user profile once per login", async () => {
    mockApi.mockResolvedValue({
      effectiveTheme: "dark",
      preferences: { theme: "dark" }
    });

    renderSync({ user: { id: "user-1" }, workspaceId: "ws-1" });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("resets to system theme when logged out", async () => {
    localStorage.setItem("kloqra-theme-test", "dark");
    renderSync(null);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
