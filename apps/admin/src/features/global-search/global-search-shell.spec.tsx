import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GlobalSearchShell } from "./global-search-shell";

vi.mock("./global-search-dialog", () => ({
  GlobalSearchDialog: () => null
}));

describe("GlobalSearchShell", () => {
  it("renders without a visible toolbar search trigger", () => {
    const html = renderToStaticMarkup(<GlobalSearchShell workspaceId="ws-1" />);
    expect(html).not.toContain('data-testid="global-search-open"');
    expect(html).toContain("Command+K");
  });
});
