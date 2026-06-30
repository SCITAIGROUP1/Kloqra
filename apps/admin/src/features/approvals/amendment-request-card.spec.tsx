import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AmendmentRequestCard } from "./amendment-request-card";

describe("AmendmentRequestCard", () => {
  it("renders approve unlock action", () => {
    const html = renderToStaticMarkup(
      <AmendmentRequestCard
        item={{
          id: "am-1",
          periodId: "period-1",
          userId: "user-1",
          userName: "Sam Rivera",
          userEmail: "member@kloqra.dev",
          workspaceId: "ws-1",
          projectId: "proj-1",
          projectName: "Support Retainer",
          periodStart: "2025-06-02T00:00:00.000Z",
          periodEnd: "2025-06-08T23:59:59.999Z",
          periodLabel: "Jun 2 – Jun 8, 2025",
          reason: "Forgot to log Friday",
          status: "PENDING",
          adminNote: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: "2025-06-09T10:00:00.000Z"
        }}
        onReview={vi.fn()}
        actioning={false}
      />
    );

    expect(html).toContain("Approve unlock");
    expect(html).toContain("Forgot to log Friday");
  });
});
