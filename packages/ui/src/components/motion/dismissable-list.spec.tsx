import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DismissableList } from "./dismissable-list.js";

describe("DismissableList", () => {
  it("renders items via renderItem", () => {
    render(
      <DismissableList
        items={[
          { id: "1", label: "Alpha" },
          { id: "2", label: "Beta" }
        ]}
        renderItem={(item) => <span>{item.label}</span>}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
