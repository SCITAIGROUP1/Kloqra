"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, AppBar } from "@kloqra/ui";
import { SupportTicketForm, getApiBase } from "@kloqra/web-shared";
import { Clock, ShieldCheck } from "lucide-react";
import { useSessionStore } from "@/stores/session.store";

const SLA_SUMMARY = [
  { icon: <ShieldCheck className="h-4 w-4 text-rose-500" />, label: "Security", value: "15 min" },
  { icon: <Clock className="h-4 w-4 text-red-500" />, label: "Bug Reports", value: "1 hour" },
  { icon: <Clock className="h-4 w-4 text-amber-500" />, label: "Billing", value: "2 hours" },
  { icon: <Clock className="h-4 w-4 text-blue-500" />, label: "Plans", value: "4 hours" },
  { icon: <Clock className="h-4 w-4 text-violet-500" />, label: "General", value: "8 hours" }
];

export default function TenantSupportPage() {
  const session = useSessionStore((s) => s.session);

  return (
    <div className="space-y-6">
      <AppBar
        title="Contact Support"
        description="Our team will respond based on the type and urgency of your request."
      />

      {/* SLA at-a-glance */}
      <div className="flex flex-wrap gap-2 md:grid md:grid-cols-5">
        {SLA_SUMMARY.map((s) => (
          <div
            key={s.label}
            className="flex-1 min-w-[120px] flex flex-col items-center gap-1 p-3 rounded-xl border bg-muted/30 text-center"
          >
            {s.icon}
            <span className="text-xs font-semibold">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main form */}
      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>New Support Request</CardTitle>
            <CardDescription>
              {session
                ? `Submitting as ${session.user.name}${session.user.email ? ` (${session.user.email})` : ""}`
                : "Fill in your details below"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupportTicketForm
              apiBase={getApiBase()}
              requesterEmail={session?.user.email ?? ""}
              requesterName={session?.user.name ?? ""}
              tenantId={session?.tenantId ?? undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
