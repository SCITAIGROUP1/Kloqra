import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedCrossfadePresence } from "./crossfade-presence-animated.js";

describe("AnimatedCrossfadePresence", () => {
  it("renders children for the active key", () => {
    render(
      <AnimatedCrossfadePresence presenceKey="panel">
        <p>Animated panel</p>
      </AnimatedCrossfadePresence>
    );
    expect(screen.getByText("Animated panel")).toBeInTheDocument();
  });
});
