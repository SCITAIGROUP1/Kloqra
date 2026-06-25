"use client";

import { CheckCircle2, Clock } from "lucide-react";

export default function RoadmapPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            What&apos;s shipped. What&apos;s coming.
          </h1>
          <p className="text-xl text-muted-foreground">
            Our timeline of features to build the ultimate time tracking platform.
          </p>
        </div>

        <div className="space-y-12">
          {/* Shipped */}
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-success" /> Shipped
            </h3>
            <div className="glass-card p-8 rounded-3xl space-y-4">
              {["Live timer engine with pause/resume", "Timesheet calendar", "Timesheet approvals & amendments", "Admin analytics dashboard", "Team live presence (SSE)", "Export wizard (14 report types)"].map(feature => (
                <div key={feature} className="flex gap-3 text-foreground">
                  <CheckCircle2 className="text-success w-5 h-5 shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Coming Soon */}
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Clock className="text-primary" /> Coming Soon
            </h3>
            <div className="glass-card p-8 rounded-3xl space-y-4 opacity-80 animate-shimmer relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5" />
              {["Budget burn-down widget", "Native mobile apps (iOS + Android)", "AI auto-categorization", "SSO (SAML/OIDC)", "QuickBooks / Xero sync"].map(feature => (
                <div key={feature} className="flex gap-3 text-muted-foreground relative z-10">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
