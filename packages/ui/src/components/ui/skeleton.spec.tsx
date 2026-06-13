import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonText } from "./skeleton.js";

describe("Skeleton", () => {
  it("renders with shimmer animation class", () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    expect(container.firstChild).toHaveClass("animate-shimmer");
    expect(container.firstChild).toHaveClass("h-8");
  });
});

describe("SkeletonText", () => {
  it("renders multiple lines", () => {
    const { container } = render(<SkeletonText lines={3} />);
    expect(container.querySelectorAll(".animate-shimmer")).toHaveLength(3);
  });
});
