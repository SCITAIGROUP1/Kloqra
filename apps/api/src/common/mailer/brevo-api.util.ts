import type { SendMailOptions, SendMailResult } from "./mailer.service";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export type ParsedFromAddress = {
  email: string;
  name?: string;
};

/** Parse `Name <email@example.com>` or a bare address. */
export function parseFromAddress(from: string): ParsedFromAddress {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: trimmed };
}

export function isBrevoSmtpHost(host: string | undefined): boolean {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return normalized.includes("brevo.com") || normalized.includes("sendinblue.com");
}

export function isBrevoSmtpKey(key: string): boolean {
  return key.startsWith("xsmtpsib-");
}

function readEnv(name: string, env: NodeJS.ProcessEnv): string | undefined {
  const raw = env[name]?.trim();
  if (!raw) return undefined;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

export function shouldUseBrevoApi(env: NodeJS.ProcessEnv): boolean {
  const transport = readEnv("EMAIL_TRANSPORT", env)?.toLowerCase();
  if (transport === "smtp") return false;
  if (transport === "brevo_api") return true;
  if (readEnv("BREVO_API_KEY", env)) return true;
  // Railway Hobby/Trial blocks outbound SMTP — HTTPS API works on all plans.
  if (env.RAILWAY_ENVIRONMENT && isBrevoSmtpHost(readEnv("SMTP_HOST", env))) {
    return true;
  }
  return false;
}

/** Brevo REST API requires an API key (xkeysib-…), not the SMTP key (xsmtpsib-…). */
export function resolveBrevoApiKey(env: NodeJS.ProcessEnv): string | undefined {
  const key = readEnv("BREVO_API_KEY", env);
  if (!key || isBrevoSmtpKey(key)) return undefined;
  return key;
}

export function brevoApiKeySetupHint(env: NodeJS.ProcessEnv): string {
  const raw = readEnv("BREVO_API_KEY", env);
  if (raw && isBrevoSmtpKey(raw)) {
    return (
      "BREVO_API_KEY is an SMTP key (xsmtpsib). Generate an API key (xkeysib) under " +
      "Brevo → SMTP & API → API keys & MCP."
    );
  }
  return (
    "Set BREVO_API_KEY to a Brevo API key (xkeysib-…). SMTP_PASS (xsmtpsib) only works for " +
    "local SMTP, not the HTTP API used on Railway."
  );
}

function sanitizeBrevoError(message: string): string {
  if (/key not found/i.test(message)) {
    return (
      "Invalid Brevo API key. Generate an API key (xkeysib-…) under Brevo → SMTP & API → " +
      "API keys & MCP — not the SMTP key (xsmtpsib-)."
    );
  }
  return message.slice(0, 240);
}

export async function sendViaBrevoApi(
  apiKey: string,
  from: string,
  opts: SendMailOptions
): Promise<SendMailResult> {
  const sender = parseFromAddress(from);
  const payload: Record<string, unknown> = {
    sender,
    to: opts.to.map((email) => ({ email })),
    subject: opts.subject,
    htmlContent: opts.html
  };

  if (opts.text) {
    payload.textContent = opts.text;
  }

  if (opts.attachments?.length) {
    payload.attachment = opts.attachments.map((attachment) => ({
      name: attachment.filename,
      content: attachment.content.toString("base64")
    }));
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      const detail = sanitizeBrevoError(body?.message ?? `Brevo API HTTP ${response.status}`);
      return { sent: false, reason: "failed", detail };
    }

    return { sent: true };
  } catch (err) {
    const detail = (err instanceof Error ? err.message : String(err)).slice(0, 240);
    return { sent: false, reason: "failed", detail };
  }
}
