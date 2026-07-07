import { describe, expect, it } from "vitest";
import {
  notificationKeysForWorkspace,
  notificationRecentKey,
  notificationUnreadKey
} from "./notification-cache-key";

describe("notification-cache-key", () => {
  it("scopes unread and recent keys by user and workspace", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const workspaceId = "22222222-2222-4222-8222-222222222222";
    expect(notificationUnreadKey(userId, workspaceId)).toBe(`${userId}:${workspaceId}`);
    expect(notificationRecentKey(userId, workspaceId, 8)).toBe(`${userId}:${workspaceId}:8`);
  });

  it("finds cache keys for a workspace across users", () => {
    const workspaceId = "22222222-2222-4222-8222-222222222222";
    const keys = {
      "user-a:ws-other": {},
      [`user-a:${workspaceId}`]: {},
      [`user-b:${workspaceId}:8`]: {}
    };
    expect(notificationKeysForWorkspace(workspaceId, keys).sort()).toEqual(
      [`user-a:${workspaceId}`, `user-b:${workspaceId}:8`].sort()
    );
  });
});
