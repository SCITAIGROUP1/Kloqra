import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.fn();
const workspaceIdRef = { current: null as string | null };

vi.mock("../../api/client", () => ({
  api: (...args: unknown[]) => api(...args)
}));

vi.mock("./tenant-api-workspace", () => ({
  useTenantApiWorkspaceId: () => workspaceIdRef.current,
  tenantApiOptions: (workspaceId: string | null) => (workspaceId ? { workspaceId } : {})
}));

describe("sales inquiry billing hooks", () => {
  beforeEach(() => {
    api.mockReset();
    workspaceIdRef.current = null;
  });

  it("loads and submits sales inquiry without a workspace id", async () => {
    api.mockResolvedValueOnce(null);
    const { useSalesInquiry, useSubmitSalesInquiry } = await import("./use-subscription-billing");

    const inquiryHook = renderHook(() => useSalesInquiry());
    await waitFor(() => expect(inquiryHook.result.current.loading).toBe(false));
    expect(api).toHaveBeenCalledWith("/tenants/current/subscription/sales-inquiry", {});

    const created = {
      id: "00000000-0000-4000-8000-0000000000aa",
      tenantId: "00000000-0000-4000-8000-000000000099",
      planSlug: "pilot",
      planName: "Enterprise",
      status: "open",
      message: null,
      billingInterval: "monthly",
      instructionsSentAt: null,
      createdAt: new Date().toISOString(),
      fulfilledAt: null
    };
    api.mockResolvedValueOnce(created);

    const submitHook = renderHook(() => useSubmitSalesInquiry());
    const result = await submitHook.result.current.submit({ planSlug: "pilot" });
    expect(result).toEqual(created);
    expect(api).toHaveBeenCalledWith(
      "/tenants/current/subscription/sales-inquiry",
      expect.objectContaining({ method: "POST" })
    );
  });
});
