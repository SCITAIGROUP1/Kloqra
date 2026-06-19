"use client";

import { Button, Input, Label } from "@kloqra/ui";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export function TwoFaSetupPanel({
  secret,
  otpauthUrl,
  code,
  onCodeChange
}: {
  secret: string;
  otpauthUrl: string;
  code: string;
  onCodeChange: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy secret");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-lg border border-border bg-white p-3 shadow-sm">
            <QRCode
              value={otpauthUrl}
              size={160}
              level="M"
              aria-label="QR code for authenticator app setup"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <div className="space-y-1">
              <p className="text-sm font-medium">Scan with your authenticator app</p>
              <p className="text-xs text-muted-foreground">
                Use Google Authenticator, 1Password, Authy, or a similar app.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Or enter manually
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-left font-mono text-xs leading-relaxed tracking-wider break-all sm:text-sm">
                  {formatSecret(secret)}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => void copySecret()}
                  aria-label="Copy secret key"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verify-code">Enter 6-digit code</Label>
        <Input
          id="verify-code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          className="max-w-xs font-mono tracking-widest"
        />
      </div>
    </div>
  );
}
