import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, getWorkspaceId, syncWorkspaceIdToStorage } from "../stores/session.store";
import { readWorkspaceIdFromToken } from "./jwt-payload";
import { resolveApiWorkspaceId } from "./workspace-context";

vi.mock("../stores/session.store", () => ({
  getAccessToken: vi.fn(),
  getWorkspaceId: vi.fn(),
  syncWorkspaceIdToStorage: vi.fn()
}));

vi.mock("./jwt-payload", () => ({
  readWorkspaceIdFromToken: vi.fn()
}));

describe("resolveApiWorkspaceId", () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockReturnValue("token");
    vi.mocked(readWorkspaceIdFromToken).mockReset();
    vi.mocked(getWorkspaceId).mockReset();
    vi.mocked(syncWorkspaceIdToStorage).mockReset();
  });

  it("prefers JWT workspace over stale explicit id", () => {
    vi.mocked(readWorkspaceIdFromToken).mockReturnValue("ws-from-jwt");

    expect(resolveApiWorkspaceId("ws-stale")).toBe("ws-from-jwt");
    expect(syncWorkspaceIdToStorage).toHaveBeenCalledWith("ws-from-jwt");
  });

  it("falls back to explicit then storage when JWT has no workspace", () => {
    vi.mocked(readWorkspaceIdFromToken).mockReturnValue(null);
    vi.mocked(getWorkspaceId).mockReturnValue("ws-storage");

    expect(resolveApiWorkspaceId("ws-explicit")).toBe("ws-explicit");
    expect(resolveApiWorkspaceId()).toBe("ws-storage");
  });
});
