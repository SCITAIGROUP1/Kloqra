/** @vitest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInviteHandoffLogin } from "./use-invite-handoff";

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams
}));

const mockApi = vi.fn();
vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => mockApi(...args)
}));

describe("useInviteHandoffLogin", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockApi.mockReset();
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
  });

  it("prefills credentials from invite token", async () => {
    mockSearchParams.set("invite", "token-1");
    mockApi.mockResolvedValue({
      email: "user@example.com",
      temporaryPassword: "Temp123!",
      requiresPasswordChange: true,
      pendingToken: "pending-1"
    });
    const onPrefill = vi.fn();

    const { result } = renderHook(() => useInviteHandoffLogin({ onPrefill }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(onPrefill).toHaveBeenCalledWith("user@example.com", "Temp123!");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("auto-redirects to set-password when auto=1", async () => {
    mockSearchParams.set("invite", "token-1");
    mockSearchParams.set("auto", "1");
    mockApi.mockResolvedValue({
      email: "user@example.com",
      temporaryPassword: "Temp123!",
      requiresPasswordChange: true,
      pendingToken: "pending-1",
      emailVerificationToken: "verify-1"
    });
    const onPrefill = vi.fn();

    const { result } = renderHook(() => useInviteHandoffLogin({ onPrefill }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockReplace).toHaveBeenCalledWith("/set-password?token=pending-1&verifyToken=verify-1");
  });

  it("reports errors when invite token is invalid", async () => {
    mockSearchParams.set("invite", "bad-token");
    mockApi.mockRejectedValue(new Error("Invite link is invalid or expired."));
    const onError = vi.fn();

    const { result } = renderHook(() => useInviteHandoffLogin({ onPrefill: vi.fn(), onError }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(onError).toHaveBeenCalledWith("Invite link is invalid or expired.");
  });
});
