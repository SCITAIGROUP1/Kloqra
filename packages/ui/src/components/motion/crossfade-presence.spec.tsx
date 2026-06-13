import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrossfadePresence } from "./crossfade-presence.js";

describe("CrossfadePresence", () => {
  it("renders children for the active key", () => {
    render(
      <CrossfadePresence presenceKey="loading">
        <p>Loading content</p>
      </CrossfadePresence>
    );
    expect(screen.getByText("Loading content")).toBeInTheDocument();
  });

  it("updates content when presenceKey changes", async () => {
    const { rerender } = render(
      <CrossfadePresence presenceKey="a">
        <p>Panel A</p>
      </CrossfadePresence>
    );
    expect(screen.getByText("Panel A")).toBeInTheDocument();

    rerender(
      <CrossfadePresence presenceKey="b">
        <p>Panel B</p>
      </CrossfadePresence>
    );
    await waitFor(() => {
      expect(screen.getByText("Panel B")).toBeInTheDocument();
    });
  });
});
