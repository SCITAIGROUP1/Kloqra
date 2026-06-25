"use client";

import { CheckCircle2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function ProjectManagerPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/roles" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-12 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Roles
        </Link>
        
        <div className="flex flex-col md:flex-row gap-8 items-start mb-16">
          <div className="w-20 h-20 rounded-2xl bg-warning/20 text-warning flex items-center justify-center text-4xl shrink-0">
            ⚡
          </div>
          <div>
            <div className="inline-flex px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-bold mb-4 tracking-wider">
              PROJECT LEAD
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Project Manager
            </h1>
            <p className="text-xl text-muted-foreground">
              A senior team member elevated to manage specific projects. They get scoped admin powers without access to workspace settings.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">What they can do</h3>
              <ul className="space-y-4">
                {[
                  "Manage tasks for led projects only",
                  "Invite team members to led projects",
                  "Approve or reject timesheets for led projects",
                  "View analytics scoped to led projects",
                  "Track live presence for their team",
                  "Use the Client app for personal time logging"
                ].map((feature, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="text-warning w-5 h-5 shrink-0" />
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
                  "Cannot view data for projects they don't lead",
                  "Cannot access the Export Wizard",
                  "Cannot see or manage billing rates",
                  "Cannot create new projects",
                  "Cannot manage workspace settings"
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
