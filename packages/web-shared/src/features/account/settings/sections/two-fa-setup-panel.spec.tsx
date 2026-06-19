/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TwoFaSetupPanel } from "./two-fa-setup-panel";

vi.mock("react-qr-code", () => ({
  default: ({ value }: { value: string }) => <div data-testid="qr-code">{value}</div>
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe("TwoFaSetupPanel", () => {
  it("renders QR code and formatted secret", () => {
    render(
      <TwoFaSetupPanel
        secret="7Y0SPZ2AWUGXRUVVZBSHBSKB5HPBNY7G"
        otpauthUrl="otpauth://totp/Kloqra:user@example.com?secret=7Y0SPZ2AWUGXRUVVZBSHBSKB5HPBNY7G&issuer=Kloqra"
        code=""
        onCodeChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("qr-code").textContent).toContain("otpauth://totp/");
    expect(screen.getByText("7Y0S PZ2A WUGX RUVV ZBSH BSKB 5HPB NY7G")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Verify and enable" })).toBeNull();
  });

  it("accepts a 6-digit code", () => {
    const onCodeChange = vi.fn();
    render(
      <TwoFaSetupPanel
        secret="ABCDEFGH"
        otpauthUrl="otpauth://totp/test"
        code="123456"
        onCodeChange={onCodeChange}
      />
    );

    expect((screen.getByLabelText("Enter 6-digit code") as HTMLInputElement).value).toBe("123456");
  });
});
