"use client";

import {
  ROUTES,
  type SalesInquiryDto,
  type SalesInquiryListResponseDto,
  parseContentDispositionFilename
} from "@kloqra/contracts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@kloqra/ui";
import { api, getApiBase, getPlatformAccessToken } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";

export function TenantSalesInquiriesCard({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<SalesInquiryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<SalesInquiryListResponseDto>(
        ROUTES.PLATFORM.TENANT_SALES_INQUIRIES(tenantId)
      );
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendInstructions(inquiryId: string) {
    setActionId(inquiryId);
    setMessage("");
    try {
      await api(ROUTES.PLATFORM.TENANT_SALES_INQUIRY_SEND_INSTRUCTIONS(tenantId, inquiryId), {
        method: "POST"
      });
      setMessage("Payment instructions sent.");
      await load();
    } catch {
      setMessage("Could not send payment instructions.");
    } finally {
      setActionId(null);
    }
  }

  async function downloadReceipt(inquiryId: string, receiptId: string, fallback: string) {
    try {
      const token = getPlatformAccessToken();
      const res = await fetch(
        `${getApiBase()}${ROUTES.PLATFORM.TENANT_SALES_INQUIRY_RECEIPT(tenantId, inquiryId, receiptId)}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const filename =
        parseContentDispositionFilename(res.headers.get("content-disposition")) ?? fallback;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Could not download receipt.");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales inquiries</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card data-testid="platform-sales-inquiries">
      <CardHeader>
        <CardTitle>Sales inquiries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {items.map((inquiry) => (
          <div
            key={inquiry.id}
            className="space-y-2 rounded-lg border border-border/70 p-4 text-sm"
            data-testid={`sales-inquiry-${inquiry.id}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{inquiry.planName}</span>
              <Badge variant="secondary">{inquiry.status.replace(/_/g, " ")}</Badge>
              {inquiry.billingInterval ? (
                <span className="text-muted-foreground">{inquiry.billingInterval}</span>
              ) : null}
            </div>
            {inquiry.message ? <p className="text-muted-foreground">{inquiry.message}</p> : null}
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(inquiry.createdAt).toLocaleString()}
            </p>
            {inquiry.status === "open" ? (
              <Button
                type="button"
                size="sm"
                disabled={actionId === inquiry.id}
                onClick={() => void sendInstructions(inquiry.id)}
                data-testid="send-payment-instructions"
              >
                {actionId === inquiry.id ? "Sending…" : "Send payment instructions"}
              </Button>
            ) : null}
            {inquiry.receipts && inquiry.receipts.length > 0 ? (
              <ul className="space-y-1">
                {inquiry.receipts.map((receipt) => (
                  <li key={receipt.id}>
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => void downloadReceipt(inquiry.id, receipt.id, receipt.filename)}
                    >
                      {receipt.filename}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
