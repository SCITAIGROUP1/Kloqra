"use client";

import { PLAN_SLUGS } from "@kloqra/contracts";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label
} from "@kloqra/ui";
import type { BillingInterval } from "@kloqra/web-shared";
import { useState } from "react";

export type ContactSalesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  billingInterval: BillingInterval;
  loading?: boolean;
  onSubmit: (input: { message?: string }) => void;
};

export function ContactSalesDialog({
  open,
  onOpenChange,
  planName,
  billingInterval,
  loading = false,
  onSubmit
}: ContactSalesDialogProps) {
  const [message, setMessage] = useState("");

  function handleSubmit() {
    onSubmit({ message: message.trim() || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="contact-sales-dialog">
        <DialogHeader>
          <DialogTitle>Contact sales — {planName}</DialogTitle>
          <DialogDescription>
            Request {planName} with {billingInterval} billing. Our team will send payment
            instructions by email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sales-message">Message (optional)</Label>
          <textarea
            id="sales-message"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            placeholder="Tell us about your team size or requirements…"
            rows={4}
            maxLength={1000}
            data-testid="contact-sales-message"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            data-testid="contact-sales-submit"
          >
            {loading ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const CONTACT_SALES_PLAN_SLUG = PLAN_SLUGS.PILOT;
