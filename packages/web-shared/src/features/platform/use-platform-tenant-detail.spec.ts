/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import { usePlatformTenantDetail } from "./use-platform-tenant-detail";

vi.mock("../../api/client", () => ({
  api: vi.fn()
}));

describe("usePlatformTenantDetail", () => {
  beforeEach(() => {
    vi.mocked(api).mockResolvedValue({
      id: "tenant-1",
      name: "Acme",
      slug: "acme",
      status: "active",
      workspaceCount: 2,
      memberCount: 5
    });
  });

  it("loads tenant detail by id", async () => {
    const { result } = renderHook(() => usePlatformTenantDetail("tenant-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(ROUTES.PLATFORM.TENANT("tenant-1"));
    expect(result.current.tenant?.name).toBe("Acme");
    expect(result.current.error).toBeNull();
  });

  it("surfaces load errors", async () => {
    vi.mocked(api).mockRejectedValue(new Error("not found"));

    const { result } = renderHook(() => usePlatformTenantDetail("missing"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tenant).toBeNull();
    expect(result.current.error).toBe("not found");
  });
});
