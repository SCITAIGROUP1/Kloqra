/** @vitest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useThemePreference } from "./use-theme-preference";

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

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="kloqra-theme-test"
    >
      {children}
    </ThemeProvider>
  );
}

describe("useThemePreference", () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockApi.mockResolvedValue({});
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
    mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ session: null })
    );
    mockUsePlatformSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ session: null })
    );
  });

  it("persists theme to tenant preferences in app scope", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SCOPE", "app");
    mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        session: { user: { id: "user-1" }, workspaceId: "ws-1" }
      })
    );

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await act(async () => {
      result.current.applyTheme("dark");
    });

    expect(mockApi).toHaveBeenCalledWith("/users/me/preferences", {
      method: "PATCH",
      workspaceId: "ws-1",
      body: JSON.stringify({ theme: "dark" })
    });
  });

  it("persists theme to platform preferences in platform scope", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_SCOPE", "platform");
    mockUsePlatformSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        session: { user: { id: "platform-user-1" } }
      })
    );

    const { result } = renderHook(() => useThemePreference(), { wrapper });

    await act(async () => {
      result.current.applyTheme("light");
    });

    expect(mockApi).toHaveBeenCalledWith("/platform/me/preferences", {
      method: "PATCH",
      body: JSON.stringify({ theme: "light" })
    });
  });
});
