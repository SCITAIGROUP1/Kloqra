import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MotionReveal } from "./motion-reveal.js";

describe("MotionReveal", () => {
  it("renders children with fade-in animation class", () => {
    render(<MotionReveal>Hello</MotionReveal>);
    const el = screen.getByText("Hello");
    expect(el).toHaveClass("animate-fade-in");
  });

  it("applies delay via inline style", () => {
    render(<MotionReveal delay={120}>Delayed</MotionReveal>);
    expect(screen.getByText("Delayed")).toHaveStyle({ animationDelay: "120ms" });
  });
});
