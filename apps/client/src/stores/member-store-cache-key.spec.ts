import { describe, expect, it } from "vitest";
import {
  memberStoreKey,
  memberStoreKeysForWorkspace,
  workspaceIdFromMemberStoreKey
} from "./member-store-cache-key";

describe("member-store-cache-key", () => {
  it("builds user-scoped keys", () => {
    expect(memberStoreKey("user-1", "ws-1")).toBe("user-1:ws-1");
    expect(memberStoreKey("user-1", "ws-1", "all")).toBe("user-1:ws-1:all");
  });

  it("extracts workspace id from keys", () => {
    expect(workspaceIdFromMemberStoreKey("user-1:ws-1:all")).toBe("ws-1");
    expect(workspaceIdFromMemberStoreKey("user-1:ws-1")).toBe("ws-1");
  });

  it("filters keys by workspace", () => {
    const keys = {
      "user-1:ws-1:all": {},
      "user-2:ws-2:all": {},
      "user-1:ws-1": {}
    };
    expect(memberStoreKeysForWorkspace(keys, "ws-1").sort()).toEqual([
      "user-1:ws-1",
      "user-1:ws-1:all"
    ]);
  });
});
