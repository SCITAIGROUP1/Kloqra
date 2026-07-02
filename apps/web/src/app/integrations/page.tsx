"use client";

import { ArrowUpRight } from "lucide-react";

const integrations = [
  {
    name: "Slack",
    description:
      "Start and stop timers directly from Slack. Receive timesheet approval notifications.",
    status: "Live",
    color: "bg-[#E01E5A]"
  },
  {
    name: "Jira",
    description: "Two-way sync for issues and tasks. Track time without leaving Jira.",
    status: "Live",
    color: "bg-[#0052CC]"
  },
  {
    name: "GitHub",
    description: "Link commits and pull requests to time entries automatically.",
    status: "Live",
    color: "bg-[#24292F]"
  },
  {
    name: "Stripe",
    description: "Convert billable hours into Stripe invoices seamlessly.",
    status: "Live",
    color: "bg-[#635BFF]"
  },
  {
    name: "QuickBooks",
    description: "Sync approved timesheets for payroll and accounting.",
    status: "Coming Soon",
    color: "bg-[#2CA01C]"
  },
  {
    name: "Microsoft Teams",
    description: "Enterprise notifications and presence integration.",
    status: "Coming Soon",
    color: "bg-[#6264A7]"
  },
  {
    name: "Linear",
    description: "Track time against Linear issues with deep linking.",
    status: "Coming Soon",
    color: "bg-[#5E6AD2]"
  },
  {
    name: "Zapier",
    description: "Connect Kloqra to 5000+ other applications.",
    status: "Coming Soon",
    color: "bg-[#FF4A00]"
  }
];

export default function IntegrationsPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Plays well with others.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Kloqra fits perfectly into your existing toolchain. Track time where you work, and sync
            data where you need it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {integrations.map((app) => (
            <div
              key={app.name}
              className="glass-card rounded-2xl p-6 flex flex-col h-full group hover:shadow-xl transition-all border border-border/50 hover:border-border"
            >
              <div className="flex items-start justify-between mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl ${app.color}`}
                >
                  {app.name.charAt(0)}
                </div>
                {app.status === "Live" ? (
                  <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider rounded">
                    Live
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider rounded">
                    Soon
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold mb-2">{app.name}</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-6">{app.description}</p>

              {app.status === "Live" ? (
                <button className="text-sm font-medium text-foreground flex items-center group-hover:text-primary transition-colors mt-auto">
                  View Integration{" "}
                  <ArrowUpRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <div className="text-sm font-medium text-muted-foreground mt-auto">
                  In Development
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
