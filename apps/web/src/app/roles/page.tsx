"use client";

import { Check, Shield } from "lucide-react";


export default function RolesOverviewPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Built for real organizations.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every role has exactly the right access. Nothing more. Nothing less.
            No more over-permissioning just to let someone pull a report.
          </p>
        </div>

        {/* Role Cards List */}
        <div className="space-y-8 mb-32">
          {/* Tenant Owner */}
          <div className="glass-card rounded-3xl p-8 md:p-12 border-l-8 border-l-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-premium transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <Shield size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <div className="inline-block px-3 py-1 rounded-full bg-premium/10 text-premium text-xs font-bold mb-4 tracking-wider">
                  ORGANIZATIONAL LEADER
                </div>
                <h2 className="text-3xl font-bold mb-4">Tenant Owner</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-xl">
                  The agency principal or company founder. Only the Tenant Owner sees the organization-wide rollup dashboard — total hours, billable revenue, and active member counts across every workspace.
                </p>
                <ul className="space-y-3 mb-8">
                  {["Full edit (name, slug, branding)", "Unlimited workspace creation", "Subscription & billing management", "Cross-workspace analytics rollup", "Organization data export (GDPR)"].map((feature, i) => (
                    <li key={i} className="flex items-center text-foreground">
                      <Check className="h-5 w-5 text-premium mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Workspace Admin */}
          <div className="glass-card rounded-3xl p-8 md:p-12 border-l-8 border-l-success relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <div className="inline-block px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold mb-4 tracking-wider">
                  WORKSPACE OPERATOR
                </div>
                <h2 className="text-3xl font-bold mb-4">Workspace Admin</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-xl">
                  A client manager or department head responsible for one workspace. They handle the day-to-day operations for their team.
                </p>
                <ul className="space-y-3 mb-8">
                  {["Projects and tasks CRUD", "Timesheet approval workflow", "Team live presence (SSE)", "Billing rates (hourly, per-member)", "Export wizard (14 report types)"].map((feature, i) => (
                    <li key={i} className="flex items-center text-foreground">
                      <Check className="h-5 w-5 text-success mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
