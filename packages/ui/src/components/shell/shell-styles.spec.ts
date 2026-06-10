import { describe, expect, it } from "vitest";
import {
  appBarActionButtonVariants,
  appBarIconButtonVariants,
  widgetShellVariants
} from "./shell-styles.js";

describe("shell-styles", () => {
  it("applies active app bar action classes", () => {
    expect(appBarActionButtonVariants({ active: true })).toContain("border-primary/30");
  });

  it("applies editing widget shell classes", () => {
    expect(widgetShellVariants({ editing: true })).toContain("ring-primary/30");
  });

  it("keeps icon button sizing consistent with sidebar brand mark", () => {
    expect(appBarIconButtonVariants()).toContain("h-10 w-10");
    expect(appBarIconButtonVariants()).toContain("rounded-xl");
  });
});
