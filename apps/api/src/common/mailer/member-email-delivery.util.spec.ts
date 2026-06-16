import { describe, expect, it, vi } from "vitest";
import {
  deliverMemberEmail,
  mapMailResultToDelivery,
  MEMBER_EMAIL_TIMEOUT_MS
} from "./member-email-delivery.util";

describe("deliverMemberEmail", () => {
  it("maps SMTP failure detail into delivery response", () => {
    const delivery = mapMailResultToDelivery({
      sent: false,
      reason: "failed",
      detail: "Invalid from address"
    });
    expect(delivery.emailFailureMessage).toBe("Invalid from address");
  });

  it("returns smtp_unconfigured when mailer is not configured", async () => {
    const result = await deliverMemberEmail(false, async () => ({ sent: true }));
    expect(result).toEqual({ emailSent: false, emailSkipReason: "smtp_unconfigured" });
  });

  it("returns emailSent when SMTP succeeds quickly", async () => {
    const result = await deliverMemberEmail(true, async () => ({ sent: true }));
    expect(result).toEqual({ emailSent: true });
  });

  it("times out slow SMTP without blocking forever", async () => {
    vi.useFakeTimers();
    const send = vi.fn(
      () =>
        new Promise<{ sent: boolean }>((resolve) => {
          setTimeout(() => resolve({ sent: true }), MEMBER_EMAIL_TIMEOUT_MS + 5_000);
        })
    );

    const pending = deliverMemberEmail(true, send);
    await vi.advanceTimersByTimeAsync(MEMBER_EMAIL_TIMEOUT_MS + 1);
    const result = await pending;

    expect(result).toEqual({
      emailSent: false,
      emailSkipReason: "send_failed",
      emailFailureMessage: "SMTP timed out after 12 seconds"
    });
    vi.useRealTimers();
  });
});
