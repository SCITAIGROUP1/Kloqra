import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRefetchOnWindowFocus } from "./use-refetch-on-window-focus";

describe("useRefetchOnWindowFocus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refetches when the tab becomes visible again", () => {
    const callback = vi.fn();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });

    renderHook(() => useRefetchOnWindowFocus(callback, true));
    document.dispatchEvent(new Event("visibilitychange"));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe when disabled", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useRefetchOnWindowFocus(vi.fn(), false));

    expect(addSpy).not.toHaveBeenCalledWith("focus", expect.any(Function));
  });
});
