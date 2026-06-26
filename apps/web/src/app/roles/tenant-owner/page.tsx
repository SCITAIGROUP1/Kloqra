"use client";

import { CheckCircle2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function TenantOwnerPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href="/roles"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-12 w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Roles
        </Link>

        <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
          <div className="w-20 h-20 rounded-2xl bg-premium/20 text-premium flex items-center justify-center text-4xl shrink-0">
            👑
          </div>
          <div>
            <div className="inline-flex px-3 py-1 rounded-full bg-premium/10 text-premium text-xs font-bold mb-4 tracking-wider">
              ORGANIZATIONAL LEADER
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Tenant Owner</h1>
            <p className="text-xl text-muted-foreground">
              The agency principal or company founder. They hold the keys to the entire
              organization, billing, and top-level analytics.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">
                What they can do
              </h3>
              <ul className="space-y-4">
                {[
                  "Edit organization profile (name, slug, branding)",
                  "Create unlimited workspaces (within plan limits)",
                  "Assign and revoke workspace admins",
                  "Invite Organization Admins to delegate tasks",
                  "View cross-workspace analytics rollup",
                  "Manage subscription, billing, and Stripe portal",
                  "Request full GDPR organization data export"
                ].map((feature, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="text-premium w-5 h-5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">
                What they CANNOT do
              </h3>
              <ul className="space-y-4">
                {[
                  "Cannot view detailed time entries in a workspace unless explicitly added as a member of that workspace",
                  "Cannot bypass workspace-level approvals from the account view"
                ].map((feature, i) => (
                  <li key={i} className="flex gap-3 text-muted-foreground">
                    <ShieldAlert className="text-muted-foreground w-5 h-5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="glass-card p-6 rounded-2xl border-l-4 border-l-premium">
              <h4 className="font-bold mb-2">App Access</h4>
              <p className="text-sm text-muted-foreground">
                Tenant Owners use the <strong>Admin App</strong> and land on the Account Overview
                (`/account`) by default.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
