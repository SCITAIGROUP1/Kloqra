/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActiveTimerSessionStore } from "./active-timer-session.store";

const mockApi = vi.fn();
const mockSetActive = vi.fn();

vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

vi.mock("@kloqra/web-shared", () => ({
  invalidateTimelogData: vi.fn()
}));

vi.mock("@/stores/timer.store", () => ({
  normalizeActiveTimer: (value: unknown) => value,
  useTimerStore: {
    getState: () => ({ setActive: mockSetActive })
  }
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: {
    getState: () => ({ session: { user: { id: "user-1" } } })
  }
}));

describe("useActiveTimerSessionStore", () => {
  beforeEach(() => {
    useActiveTimerSessionStore.setState({ refCounts: {}, initialized: {}, inflight: {} });
    mockApi.mockReset();
    mockSetActive.mockReset();
  });

  it("shares one active-timer fetch across subscribers", async () => {
    mockApi.mockResolvedValue(null);

    const unsubA = useActiveTimerSessionStore.getState().subscribeActive("ws-1");
    const unsubB = useActiveTimerSessionStore.getState().subscribeActive("ws-1");

    await vi.waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1);
    });
    expect(mockSetActive).toHaveBeenCalledWith(null);

    unsubA();
    unsubB();
  });

  it("clears subscription state on full clear", () => {
    useActiveTimerSessionStore.setState({
      refCounts: { "user-1:ws-1": 1 },
      initialized: { "user-1:ws-1": true }
    });

    useActiveTimerSessionStore.getState().clear();

    expect(useActiveTimerSessionStore.getState().refCounts).toEqual({});
    expect(useActiveTimerSessionStore.getState().initialized).toEqual({});
    expect(useActiveTimerSessionStore.getState().inflight).toEqual({});
  });
});
