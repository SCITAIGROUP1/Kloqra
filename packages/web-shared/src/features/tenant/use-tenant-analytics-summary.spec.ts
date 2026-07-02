/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTenantAnalyticsSummary } from "./use-tenant-analytics-summary";

const api = vi.fn();

vi.mock("../../api/client", () => ({
  api: (...args: unknown[]) => api(...args)
}));

vi.mock("../../stores/session.store", () => ({
  getWorkspaceId: () => "ws-1",
  useSessionStore: (selector: (s: { session: { workspaceId: string } }) => unknown) =>
    selector({ session: { workspaceId: "ws-1" } })
}));

describe("useTenantAnalyticsSummary", () => {
  beforeEach(() => {
    api.mockReset();
    api.mockResolvedValue({
      period: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T23:59:59.999Z" },
      totals: {
        totalHours: 10,
        billableHours: 8,
        billableAmount: 800,
        billablePercent: 80,
        activeMembers: 2,
        activeWorkspaces: 1,
        currency: "USD"
      },
      byWorkspace: []
    });
  });

  it("loads summary for the given period", async () => {
    const from = "2026-01-01T00:00:00.000Z";
    const to = "2026-01-31T23:59:59.999Z";

    const { result } = renderHook(() => useTenantAnalyticsSummary(from, to));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api).toHaveBeenCalledWith(
      `${ROUTES.TENANTS.ANALYTICS_SUMMARY}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { workspaceId: "ws-1" }
    );
    expect(result.current.summary?.totals.totalHours).toBe(10);
    expect(result.current.error).toBeNull();
  });
});
