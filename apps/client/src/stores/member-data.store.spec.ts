/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SUBMISSIONS, submissionStoreKey, useMySubmissionsStore } from "./member-data.store";

const mockApi = vi.fn();

vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

vi.mock("@/stores/timer.store", () => ({
  normalizeActiveTimer: (value: unknown) => value,
  useTimerStore: {
    getState: () => ({ setActive: vi.fn() })
  }
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: {
    getState: () => ({ session: { user: { id: "user-1" } } })
  }
}));

describe("useMySubmissionsStore", () => {
  beforeEach(() => {
    useMySubmissionsStore.setState({ byKey: {}, refCounts: {} });
    mockApi.mockReset();
  });

  it("shares submissions across subscribers for the same query key", async () => {
    mockApi.mockResolvedValue({ items: [{ id: "s1", status: "DRAFT" }] });
    const listKey = submissionStoreKey("user-1", "ws1", "all");
    const unsubA = useMySubmissionsStore
      .getState()
      .subscribe("ws1", "all", "/timesheets/submissions");
    const unsubB = useMySubmissionsStore
      .getState()
      .subscribe("ws1", "all", "/timesheets/submissions");

    await vi.waitFor(() => {
      expect(useMySubmissionsStore.getState().byKey[listKey]?.items).toHaveLength(1);
    });
    expect(mockApi).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  it("refetches active subscriptions when invalidated", async () => {
    mockApi.mockResolvedValue({ items: [{ id: "s1", status: "DRAFT" }] });
    const listKey = submissionStoreKey("user-1", "ws1", "all");
    const unsub = useMySubmissionsStore
      .getState()
      .subscribe("ws1", "all", "/timesheets/submissions");

    await vi.waitFor(() => {
      expect(useMySubmissionsStore.getState().byKey[listKey]?.items).toHaveLength(1);
    });

    mockApi.mockResolvedValue({ items: [{ id: "s2", status: "SUBMITTED" }] });
    useMySubmissionsStore.getState().invalidate("ws1");

    await vi.waitFor(() => {
      expect(useMySubmissionsStore.getState().byKey[listKey]?.items[0]?.id).toBe("s2");
    });
    expect(mockApi).toHaveBeenCalledTimes(2);

    unsub();
  });

  it("exposes a stable empty submissions constant", () => {
    expect(EMPTY_SUBMISSIONS).toEqual([]);
  });
});
