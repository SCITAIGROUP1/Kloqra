/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_SUBMISSIONS, useMySubmissionsStore } from "./member-data.store";

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

describe("useMySubmissionsStore", () => {
  beforeEach(() => {
    useMySubmissionsStore.setState({ byKey: {}, refCounts: {} });
    mockApi.mockReset();
  });

  it("shares submissions across subscribers for the same query key", async () => {
    mockApi.mockResolvedValue({ items: [{ id: "s1", status: "DRAFT" }] });
    const unsubA = useMySubmissionsStore
      .getState()
      .subscribe("ws1", "all", "/timesheets/submissions");
    const unsubB = useMySubmissionsStore
      .getState()
      .subscribe("ws1", "all", "/timesheets/submissions");

    await vi.waitFor(() => {
      expect(useMySubmissionsStore.getState().byKey["ws1:all"]?.items).toHaveLength(1);
    });
    expect(mockApi).toHaveBeenCalledTimes(1);

    unsubA();
    unsubB();
  });

  it("exposes a stable empty submissions constant", () => {
    expect(EMPTY_SUBMISSIONS).toEqual([]);
  });
});
