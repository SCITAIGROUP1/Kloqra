import type { MemberEmailDeliveryDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

function resendToastMessage(res: MemberEmailDeliveryDto): string {
  if (res.emailSent) return "sent";
  if (res.emailSkipReason === "smtp_unconfigured") return "unconfigured";
  return res.emailFailureMessage ?? "generic";
}

describe("team member resend credentials", () => {
  it("surfaces SMTP failure detail in admin messaging", () => {
    expect(
      resendToastMessage({
        emailSent: false,
        emailSkipReason: "send_failed",
        emailFailureMessage: "Invalid from"
      })
    ).toBe("Invalid from");
  });
});
