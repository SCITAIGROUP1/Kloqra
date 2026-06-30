import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedDismissableList } from "./dismissable-list-animated.js";

describe("AnimatedDismissableList", () => {
  it("renders list items", () => {
    render(
      <AnimatedDismissableList
        items={[
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" }
        ]}
        renderItem={(item) => <span>{item.label}</span>}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
