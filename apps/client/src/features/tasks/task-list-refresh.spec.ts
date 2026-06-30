import { useRefetchOnWindowFocus } from "@kloqra/web-shared";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("task catalog refresh on focus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reloads cached task lists when the browser tab regains focus", () => {
    const reload = vi.fn();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });

    renderHook(() => useRefetchOnWindowFocus(reload, true));
    window.dispatchEvent(new Event("focus"));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
