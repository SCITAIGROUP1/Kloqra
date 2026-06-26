"use client";

import { CheckCircle2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { TimerMockup } from "../../../components/showcase/timer-mockup";

export default function MemberPage() {
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
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-4xl shrink-0">
            👤
          </div>
          <div>
            <div className="inline-flex px-3 py-1 rounded-full bg-muted text-foreground text-xs font-bold mb-4 tracking-wider border border-border">
              TIME LOGGER
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Member</h1>
            <p className="text-xl text-muted-foreground">
              Staff members logging their time. Their experience is intentionally simplified to stay
              out of the way of their real work.
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
                  "Track time manually or use the live stopwatch across multiple devices",
                  "View day, week, and month timesheet views with advanced filtering",
                  "Manage and view assigned projects and tasks with granular detail",
                  "Submit timesheets and track approval status in real-time",
                  "Request amendments for already-approved timesheets seamlessly",
                  "Track time seamlessly within Jira using our native 2-way integration",
                  "Connect with Slack & Microsoft Teams for chat-based time logging",
                  "Sync with Google Calendar and Outlook to auto-fill your timesheets",
                  "View personal analytics dashboard with AI-driven insights",
                  "Receive real-time multi-channel notifications on updates",
                  "Manage personal profile, preferences, and timezone settings",
                  "Chat with the intelligent AI Assistant for workflow automation",
                  "Export personal time data into standard formats (CSV, PDF, Excel)",
                  "Enjoy a fully accessible interface with built-in Dark Mode",
                  "Work offline with local caching and auto-sync when reconnected",
                  "Log in securely via Enterprise SSO (Okta, Azure AD, Google Workspace)"
                ].map((feature, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">
                Privacy is paramount
              </h3>
              <p className="text-muted-foreground mb-4">
                Members are protected by strict privacy defaults. They CANNOT:
              </p>
              <ul className="space-y-4">
                {[
                  "Cannot see other members' hours or data",
                  "Cannot view peer rankings",
                  "Cannot see organization-wide revenue",
                  "Cannot access admin aggregates or reports"
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

        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6 border-b border-border pb-4">
            The Member Experience
          </h3>
          <div className="flex flex-col md:flex-row gap-12 items-center bg-card/30 p-8 rounded-3xl border border-border/50">
            <div className="flex-1">
              <h4 className="text-xl font-bold mb-4">Your time, tracked automatically.</h4>
              <p className="text-muted-foreground mb-6">
                Stop managing spreadsheets. Start a timer, we handle the rest.
              </p>
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex gap-3">
                  <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Press Space to start ·
                  Space to stop
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> One active timer per
                  session
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Pause and resume
                  without losing time
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <TimerMockup />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
