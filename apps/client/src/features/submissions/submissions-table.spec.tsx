import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SubmissionsTable } from "./submissions-table";

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    useTimelogListQuery: () => ({
      data: { items: [] },
      refetch: vi.fn(),
      isLoading: false,
      error: null
    }),
    useTimelogMutations: () => ({
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      createBatch: vi.fn(),
      commitUpsert: vi.fn(),
      invalidateAll: vi.fn()
    })
  };
});

const draftSubmission = {
  id: "period-1",
  userId: "user-1",
  workspaceId: "ws-1",
  projectId: "proj-1",
  projectName: "Support Retainer",
  periodStart: "2025-06-02T00:00:00.000Z",
  periodEnd: "2025-06-08T23:59:59.999Z",
  approvalPeriod: "weekly" as const,
  status: "DRAFT" as const,
  note: null,
  reviewNote: null,
  reviewedBy: null,
  submittedAt: null,
  reviewedAt: null
};

describe("SubmissionsTable", () => {
  it("renders table headers and submit action for draft rows", () => {
    const html = renderToStaticMarkup(
      <SubmissionsTable
        submissions={[draftSubmission]}
        onSubmitted={() => {}}
        workspaceId="ws-1"
        timezone="UTC"
      />
    );

    expect(html).toContain("Period");
    expect(html).toContain("Project");
    expect(html).toContain("Support Retainer");
    expect(html).toContain("Submit");
    expect(html).toContain("date=2025-06-02");
  });
});
