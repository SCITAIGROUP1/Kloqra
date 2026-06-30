import { render, screen } from "@testing-library/react";
import { Badge, badgeVariants } from "./badge.js";

describe("Badge", () => {
  it("renders badge text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies subtle status variants from theme tokens", () => {
    expect(badgeVariants({ variant: "success-subtle" })).toContain("status-success-bg");
    expect(badgeVariants({ variant: "warning-subtle" })).toContain("status-warning-fg");
    expect(badgeVariants({ variant: "info-subtle" })).toContain("status-info-border");
    expect(badgeVariants({ variant: "danger-subtle" })).toContain("status-danger-fg");
  });
});
