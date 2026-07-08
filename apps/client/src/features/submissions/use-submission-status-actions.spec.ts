/** @vitest-environment jsdom */
import { ROUTES } from "@kloqra/contracts";
import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitButtonLabel, useSubmissionStatusActions } from "./use-submission-status-actions";

const mockApi = vi.fn();
const mockOnSubmitted = vi.fn();

vi.mock("@/lib/api", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock("@/hooks/use-is-impersonating", () => ({
  useIsImpersonating: () => false
}));

vi.mock("@/stores/session.store", () => ({
  useSessionStore: (selector: (s: { session: { workspaceId: string } }) => unknown) =>
    selector({ session: { workspaceId: "ws-1" } }),
  getWorkspaceId: () => "ws-1"
}));

const basePeriod: TimesheetPeriodDto = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  projectName: "Support Retainer",
  periodStart: "2026-07-07T00:00:00.000Z",
  periodEnd: "2026-07-13T23:59:59.999Z",
  approvalPeriod: "weekly",
  status: "DRAFT",
  note: null,
  reviewNote: null,
  reviewedBy: null,
  submittedAt: null,
  reviewedAt: null
};

describe("submitButtonLabel", () => {
  it("maps approval period to button copy", () => {
    expect(submitButtonLabel("daily")).toBe("Submit day");
    expect(submitButtonLabel("monthly")).toBe("Submit month");
    expect(submitButtonLabel("weekly")).toBe("Submit");
  });
});

describe("useSubmissionStatusActions", () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockOnSubmitted.mockReset();
    mockApi.mockResolvedValue({ targetPeriod: basePeriod, cascadedPeriods: [] });
  });

  it("uses periodStart as the submit preview date (not re-encoded local Date)", async () => {
    const { result } = renderHook(() => useSubmissionStatusActions(basePeriod, mockOnSubmitted));

    await act(async () => {
      await result.current.loadPreview();
    });

    expect(mockApi).toHaveBeenCalledWith(
      `${ROUTES.TIMESHEETS.SUBMIT_PREVIEW}?projectId=proj-1&date=2026-07-07T00%3A00%3A00.000Z`,
      { workspaceId: "ws-1" }
    );
  });

  it("submits with periodStart from the row", async () => {
    mockApi.mockResolvedValue({ period: basePeriod });
    const { result } = renderHook(() => useSubmissionStatusActions(basePeriod, mockOnSubmitted));

    await act(async () => {
      await result.current.confirmSubmit();
    });

    expect(mockApi).toHaveBeenCalledWith(ROUTES.TIMESHEETS.SUBMIT, {
      method: "POST",
      workspaceId: "ws-1",
      body: JSON.stringify({
        date: "2026-07-07T00:00:00.000Z",
        projectId: "proj-1",
        note: undefined
      })
    });
    expect(mockOnSubmitted).toHaveBeenCalled();
  });
});
