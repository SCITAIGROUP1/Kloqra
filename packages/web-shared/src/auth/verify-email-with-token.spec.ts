import { ROUTES } from "@kloqra/contracts";
import { describe, expect, it, vi } from "vitest";
import { verifyEmailWithToken } from "./verify-email-with-token";

const mockApi = vi.fn();
vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

describe("verifyEmailWithToken", () => {
  it("posts the verification token to the auth API", async () => {
    mockApi.mockResolvedValue({
      accessToken: "access-1",
      workspaceId: "ws-1",
      user: { id: "user-1", email: "user@example.com", name: "User" }
    });

    await verifyEmailWithToken("verify-token");

    expect(mockApi).toHaveBeenCalledWith(ROUTES.AUTH.VERIFY_EMAIL, {
      method: "POST",
      body: JSON.stringify({ token: "verify-token" })
    });
  });
});
