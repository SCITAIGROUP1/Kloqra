"use client";

import { CheckCircle2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function WorkspaceAdminPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/roles" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-12 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Roles
        </Link>
        
        <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
          <div className="w-20 h-20 rounded-2xl bg-success/20 text-success flex items-center justify-center text-4xl shrink-0">
            🛠
          </div>
          <div>
            <div className="inline-flex px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold mb-4 tracking-wider">
              WORKSPACE OPERATOR
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Workspace Admin
            </h1>
            <p className="text-xl text-muted-foreground">
              A client manager or department head responsible for the day-to-day operations of a single workspace.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">What they can do</h3>
              <ul className="space-y-4">
                {[
                  "Manage all projects, tasks, and categories",
                  "Invite team members to the workspace",
                  "Approve or reject timesheets for all projects",
                  "View workspace-wide analytics dashboard",
                  "Monitor team live presence",
                  "Manage billing rates",
                  "Use the Export Wizard for 14 report types"
                ].map((feature, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="text-success w-5 h-5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">What they CANNOT do</h3>
              <ul className="space-y-4">
                {[
                  "Cannot access other workspaces without a separate invite",
                  "Cannot manage top-level tenant organization settings",
                  "Cannot access subscription billing or Stripe"
                ].map((feature, i) => (
                  <li key={i} className="flex gap-3 text-muted-foreground">
                    <ShieldAlert className="text-muted-foreground w-5 h-5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
