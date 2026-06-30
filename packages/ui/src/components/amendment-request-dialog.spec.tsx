import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmendmentRequestDialog } from "./amendment-request-dialog.js";

describe("AmendmentRequestDialog", () => {
  it("renders project and period summary", () => {
    render(
      <AmendmentRequestDialog
        open
        onOpenChange={() => {}}
        projectName="Support Retainer"
        periodLabel="Jun 2 – Jun 8, 2025"
        onSubmit={() => {}}
      />
    );

    expect(screen.getByText("Support Retainer")).toBeInTheDocument();
    expect(screen.getByText("Jun 2 – Jun 8, 2025")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm request" })).toBeInTheDocument();
  });
});
