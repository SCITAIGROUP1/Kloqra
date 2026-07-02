"use client";

import type { SalesInquiryDto } from "@kloqra/contracts";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@kloqra/ui";
import { useRef } from "react";

export type SalesInquiryStatusCardProps = {
  inquiry: SalesInquiryDto;
  uploading?: boolean;
  onUpload: (file: File) => void;
};

function statusMessage(inquiry: SalesInquiryDto): string {
  switch (inquiry.status) {
    case "open":
      return "Your request was received. We will send payment instructions shortly.";
    case "awaiting_receipt":
      return "Payment instructions were sent. Upload your receipt below.";
    case "receipt_submitted":
      return "Receipt received — our team is reviewing your upgrade.";
    default:
      return "Sales inquiry in progress.";
  }
}

export function SalesInquiryStatusCard({
  inquiry,
  uploading = false,
  onUpload
}: SalesInquiryStatusCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card data-testid="sales-inquiry-status">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {inquiry.planName} request
          {inquiry.status ? ` — ${inquiry.status.replace(/_/g, " ")}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{statusMessage(inquiry)}</p>
        {inquiry.status === "awaiting_receipt" ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="hidden"
              data-testid="sales-receipt-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              data-testid="sales-receipt-upload"
            >
              {uploading ? "Uploading…" : "Upload receipt"}
            </Button>
            <span className="text-xs">PDF, PNG, or JPG up to 5 MB</span>
          </div>
        ) : null}
        {inquiry.receipts && inquiry.receipts.length > 0 ? (
          <p className="text-xs">
            {inquiry.receipts.length} receipt{inquiry.receipts.length === 1 ? "" : "s"} on file.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
