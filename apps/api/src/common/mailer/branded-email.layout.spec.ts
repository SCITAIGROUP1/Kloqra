import { BRAND_COLORS, BRAND_NAME } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  subjectPrefix
} from "./branded-email.layout";

describe("branded-email.layout", () => {
  it("prefixes subjects with the brand name", () => {
    expect(subjectPrefix("Reset your password")).toBe(`[${BRAND_NAME}] Reset your password`);
  });

  it("renders branded html with variant pill, CTA, and details", () => {
    const html = renderBrandedEmailHtml({
      title: "Reset your password",
      preheader: "Choose a new password",
      body: "We received a request to reset your password.",
      ctaHref: "https://app.example.com/reset",
      ctaLabel: "Reset password",
      variant: "attention",
      footer: "Ignore this if you did not request it."
    });

    expect(html).toContain(BRAND_NAME);
    expect(html).toContain(BRAND_COLORS.primary);
    expect(html).toContain("Reset your password");
    expect(html).toContain("Action needed");
    expect(html).toContain("https://app.example.com/reset");
  });

  it("renders plain-text fallback with CTA link", () => {
    const text = renderBrandedEmailText({
      title: "Verify your email",
      preheader: "Confirm your account",
      body: "Please verify your email.",
      ctaHref: "https://app.example.com/verify",
      ctaLabel: "Verify email"
    });

    expect(text).toContain("Verify email: https://app.example.com/verify");
  });
});
