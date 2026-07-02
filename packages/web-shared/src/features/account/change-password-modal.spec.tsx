/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChangePasswordModal } from "./change-password-modal";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe("ChangePasswordModal", () => {
  it("uses modal footer actions instead of an extra close control in the body", () => {
    render(<ChangePasswordModal open onOpenChange={vi.fn()} onChangePassword={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Update password" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("submits the password change through the footer action", async () => {
    const onChangePassword = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign }
    });

    render(
      <ChangePasswordModal open onOpenChange={onOpenChange} onChangePassword={onChangePassword} />
    );

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "OldPass1!" }
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "NewPass1!" }
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "NewPass1!" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(onChangePassword).toHaveBeenCalledWith("OldPass1!", "NewPass1!");
    });
  });
});
