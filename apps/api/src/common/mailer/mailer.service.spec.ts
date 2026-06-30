import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("MailerService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("is not configured when SMTP_HOST is missing", async () => {
    delete process.env.SMTP_HOST;
    const { MailerService: Svc } = await import("./mailer.service");
    const mailer = new Svc();
    expect(mailer.isConfigured).toBe(false);
    const result = await mailer.send({
      to: ["user@example.com"],
      subject: "Test",
      html: "<p>hi</p>"
    });
    expect(result).toEqual({ sent: false, reason: "unconfigured" });
  });

  it("is not configured when SMTP_USER or SMTP_PASS is missing", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    delete process.env.SMTP_PASS;
    const { MailerService: Svc } = await import("./mailer.service");
    const mailer = new Svc();
    expect(mailer.isConfigured).toBe(false);
  });

  it("readEnvValue strips wrapping quotes from env values", async () => {
    process.env.SMTP_FROM = '"Chamal Nihathamana <cjaliya.sln2@gmail.com>"';
    const { readEnvValue } = await import("./mailer.service");
    expect(readEnvValue("SMTP_FROM")).toBe("Chamal Nihathamana <cjaliya.sln2@gmail.com>");
  });

  it("uses Brevo HTTPS API on Railway instead of blocked SMTP", async () => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    process.env.SMTP_HOST = "smtp-relay.brevo.com";
    process.env.BREVO_API_KEY = "xkeysib-test-key";
    process.env.SMTP_FROM = "Kloqra <noreply@kloqra.app>";
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));

    const { MailerService: Svc } = await import("./mailer.service");
    const mailer = new Svc();
    expect(mailer.isConfigured).toBe(true);

    const result = await mailer.send({
      to: ["member@example.com"],
      subject: "Welcome",
      html: "<p>hi</p>"
    });

    expect(result).toEqual({ sent: true });
    expect(global.fetch).toHaveBeenCalled();
  });
});
