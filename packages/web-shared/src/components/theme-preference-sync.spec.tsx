/** @vitest-environment jsdom */
import { render, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearThemeHydration } from "../hooks/theme-preference-state";
import { ThemePreferenceSync } from "./theme-preference-sync";

const mockApi = vi.fn();
const mockUseSessionStore = vi.fn();
const mockUsePlatformSessionStore = vi.fn();

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

vi.mock("../stores/session.store", () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => mockUseSessionStore(selector),
  getWorkspaceId: () => "ws-1"
}));

vi.mock("../stores/platform-session.store", () => ({
  usePlatformSessionStore: (selector: (state: unknown) => unknown) =>
    mockUsePlatformSessionStore(selector)
}));

function renderSync(
  session: { user: { id: string }; workspaceId: string } | null,
  options?: { platformSession?: { user: { id: string } } | null; authScope?: string }
) {
  vi.stubEnv("NEXT_PUBLIC_AUTH_SCOPE", options?.authScope ?? "app");
  mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({ session })
  );
  mockUsePlatformSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({ session: options?.platformSession ?? null })
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
    clearThemeHydration();
    vi.unstubAllEnvs();
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

  it("hydrates theme from platform profile when auth scope is platform", async () => {
    mockApi.mockResolvedValue({
      effectiveTheme: "dark",
      preferences: { theme: "dark" }
    });

    renderSync(null, {
      authScope: "platform",
      platformSession: { user: { id: "platform-user-1" } }
    });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith("/platform/me", undefined);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
