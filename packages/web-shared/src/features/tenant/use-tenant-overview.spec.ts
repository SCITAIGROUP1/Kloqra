/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTenantOverview } from "./use-tenant-overview";

const api = vi.fn();

vi.mock("../../api/client", () => ({
  api: (...args: unknown[]) => api(...args)
}));

const sessionState = {
  session: { workspaceId: "ws-1" } as { workspaceId?: string }
};

vi.mock("../../stores/session.store", () => ({
  useSessionStore: (selector: (s: typeof sessionState) => unknown) => selector(sessionState)
}));

vi.mock("../../auth/workspace-context", () => ({
  resolveApiWorkspaceId: (explicit?: string | null) => explicit ?? null
}));

describe("useTenantOverview", () => {
  beforeEach(() => {
    api.mockReset();
    sessionState.session = { workspaceId: "ws-1" };
  });

  it("loads overview when a workspace is active", async () => {
    api.mockResolvedValue({
      tenant: { id: "tenant-1", name: "Acme", slug: "acme", status: "active" },
      workspaceCount: 2,
      seatCount: 5,
      subscription: { planName: "Pro", status: "active" }
    });

    const { result } = renderHook(() => useTenantOverview());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(ROUTES.TENANTS.OVERVIEW, { workspaceId: "ws-1" });
    expect(result.current.overview?.workspaceCount).toBe(2);
  });

  it("loads overview without a workspace during onboarding", async () => {
    sessionState.session = {};
    api.mockResolvedValue({
      tenant: {
        id: "tenant-1",
        name: "Provisioned Org",
        slug: "provisioned-org",
        status: "active"
      },
      workspaceCount: 0,
      seatCount: 1,
      subscription: { planName: "Trial", status: "trialing" }
    });

    const { result } = renderHook(() => useTenantOverview());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(ROUTES.TENANTS.OVERVIEW, {});
    expect(result.current.overview?.workspaceCount).toBe(0);
  });
});
