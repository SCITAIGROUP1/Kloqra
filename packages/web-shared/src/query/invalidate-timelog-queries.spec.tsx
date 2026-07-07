/** @vitest-environment jsdom */
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateTimelogQueries } from "./invalidate-timelog-queries";
import { getQueryClient, resetQueryClient } from "./query-client";
import { timelogQueryKeys } from "./timelog-query-keys";

describe("invalidateTimelogQueries", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000099";
  const path = "/timelogs?from=2026-07-01&to=2026-07-08";

  beforeEach(() => {
    resetQueryClient();
  });

  it("refetches active timelog queries on the shared provider client", async () => {
    const client = getQueryClient();
    const cancelSpy = vi.spyOn(client, "cancelQueries");
    const refetchSpy = vi.spyOn(client, "refetchQueries");
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "log-1" }] })
      .mockResolvedValueOnce({ items: [{ id: "log-1" }, { id: "log-2" }] });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: timelogQueryKeys.list(workspaceId, path),
          queryFn
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);

    await invalidateTimelogQueries(workspaceId);

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: timelogQueryKeys.workspace(workspaceId)
    });
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: timelogQueryKeys.workspace(workspaceId),
      type: "all"
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });

  it("refetches inactive cached timelog queries after invalidation", async () => {
    const client = getQueryClient();
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "log-1" }] })
      .mockResolvedValueOnce({ items: [{ id: "log-1" }, { id: "log-2" }] });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { unmount } = renderHook(
      () =>
        useQuery({
          queryKey: timelogQueryKeys.list(workspaceId, path),
          queryFn
        }),
      { wrapper }
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
    unmount();

    await invalidateTimelogQueries(workspaceId);

    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  });
});
