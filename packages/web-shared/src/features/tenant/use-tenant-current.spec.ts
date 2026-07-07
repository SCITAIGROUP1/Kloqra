/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTenantCurrent } from "./use-tenant-current";

const api = vi.fn();

vi.mock("../../api/client", () => ({
  api: (...args: unknown[]) => api(...args)
}));

const sessionState = {
  session: { workspaceId: "ws-1" } as { workspaceId?: string }
};

vi.mock("../../stores/session.store", () => ({
  getWorkspaceId: () => sessionState.session.workspaceId ?? null,
  useSessionStore: (selector: (s: typeof sessionState) => unknown) => selector(sessionState)
}));

vi.mock("../../auth/workspace-context", () => ({
  resolveApiWorkspaceId: (explicit?: string | null) => explicit ?? null
}));

describe("useTenantCurrent", () => {
  beforeEach(() => {
    api.mockReset();
    sessionState.session = { workspaceId: "ws-1" };
  });

  it("loads the current tenant when a workspace is active", async () => {
    api.mockResolvedValue({
      id: "tenant-1",
      name: "Acme",
      slug: "acme",
      status: "active",
      settings: {},
      createdAt: new Date().toISOString()
    });

    const { result } = renderHook(() => useTenantCurrent());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(ROUTES.TENANTS.CURRENT, { workspaceId: "ws-1" });
    expect(result.current.tenant?.slug).toBe("acme");
    expect(result.current.error).toBeNull();
  });

  it("loads the current tenant without a workspace during onboarding", async () => {
    sessionState.session = {};
    api.mockResolvedValue({
      id: "tenant-1",
      name: "Provisioned Org",
      slug: "provisioned-org",
      status: "pending_setup",
      settings: {},
      createdAt: new Date().toISOString()
    });

    const { result } = renderHook(() => useTenantCurrent());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(ROUTES.TENANTS.CURRENT, {});
    expect(result.current.tenant?.status).toBe("pending_setup");
    expect(result.current.error).toBeNull();
  });
});
