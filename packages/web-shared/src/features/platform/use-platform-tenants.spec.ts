/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import { usePlatformTenants } from "./use-platform-tenants";

vi.mock("../../api/client", () => ({
  api: vi.fn()
}));

describe("usePlatformTenants", () => {
  beforeEach(() => {
    vi.mocked(api).mockResolvedValue({
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
      items: [{ id: "tenant-1", name: "Acme", slug: "acme" }]
    });
  });

  it("loads tenants with pagination defaults", async () => {
    const { result } = renderHook(() => usePlatformTenants({ debounceMs: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(`${ROUTES.PLATFORM.TENANTS}?page=1&limit=25`);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("debounces search and resets page", async () => {
    const { result } = renderHook(() => usePlatformTenants({ debounceMs: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setPage(2);
      result.current.setSearch("demo");
    });

    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith(`${ROUTES.PLATFORM.TENANTS}?page=1&limit=25&search=demo`)
    );
  });

  it("passes status and plan filters", async () => {
    const { result } = renderHook(() =>
      usePlatformTenants({
        debounceMs: 0,
        status: "active",
        planSlug: "pilot",
        subscriptionStatus: "trial"
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(
      `${ROUTES.PLATFORM.TENANTS}?page=1&limit=25&status=active&planSlug=pilot&subscriptionStatus=trial`
    );
  });
});
