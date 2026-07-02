"use client";

import { Button } from "@kloqra/ui";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyableValue({
  label,
  value,
  testId
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="font-mono text-foreground">{value}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          onClick={() => void copy()}
          data-testid={testId}
        >
          <Copy className="size-3.5" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
