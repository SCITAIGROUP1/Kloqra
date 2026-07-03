import { describe, it, expect } from "vitest";
import { sendPhoneOtpSchema, verifyPhoneOtpSchema } from "./user-profile.dto.js";

describe("phone verification DTO schemas", () => {
  describe("sendPhoneOtpSchema", () => {
    it("accepts valid E.164 phone numbers", () => {
      const result = sendPhoneOtpSchema.safeParse({ phone: "+12025550143" });
      expect(result.success).toBe(true);
    });

    it("rejects phone numbers without starting +", () => {
      const result = sendPhoneOtpSchema.safeParse({ phone: "12025550143" });
      expect(result.success).toBe(false);
    });

    it("rejects phone numbers with spaces or formatting", () => {
      const result = sendPhoneOtpSchema.safeParse({ phone: "+1 202 555 0143" });
      expect(result.success).toBe(false);
    });
  });

  describe("verifyPhoneOtpSchema", () => {
    it("accepts 6-digit numeric codes", () => {
      const result = verifyPhoneOtpSchema.safeParse({ code: "123456" });
      expect(result.success).toBe(true);
    });

    it("rejects short or long codes", () => {
      const result = verifyPhoneOtpSchema.safeParse({ code: "123" });
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric codes", () => {
      const result = verifyPhoneOtpSchema.safeParse({ code: "abc123" });
      expect(result.success).toBe(false);
    });
  });
});
