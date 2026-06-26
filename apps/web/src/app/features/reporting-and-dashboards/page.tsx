"use client";

import { Button } from "@kloqra/ui";
import { ArrowLeft, BarChart4, PieChart, TrendingUp, Download, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ReportingPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link
          href="/features"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-12 w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </Link>

        <div className="text-center mb-24">
          <div className="inline-flex items-center justify-center p-4 bg-premium/10 text-premium rounded-full mb-6">
            <BarChart4 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Reporting & Dashboards
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform raw time data into actionable intelligence. Drill down into utilization,
            profitability, and cross-workspace rollups instantly.
          </p>
        </div>

        <div className="space-y-32">
          {/* Admin Dashboard */}
          <section className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">The Admin Dashboard</h2>
              <p className="text-lg text-muted-foreground mb-6">
                A bird's-eye view of your entire organization. Track cross-workspace metrics in
                real-time, designed specifically for Tenant Owners and Org Admins.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Total billable vs non-billable revenue",
                  "Cross-workspace active member counts",
                  "Aggregated project budget burn-downs",
                  "Top performing workspaces by margin"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-premium shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="bg-premium hover:bg-premium/90 text-white">
                <Link href="http://localhost:3000/register">Explore Dashboards</Link>
              </Button>
            </div>
            <div className="flex-1 w-full grid grid-cols-2 gap-4">
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between h-32 border border-premium/20">
                <span className="text-sm text-muted-foreground">Org Revenue (YTD)</span>
                <span className="text-2xl font-bold text-premium">$482,500</span>
              </div>
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between h-32 border border-premium/20">
                <span className="text-sm text-muted-foreground">Global Utilization</span>
                <span className="text-2xl font-bold text-success flex items-center gap-2">
                  84% <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="glass-card p-6 rounded-2xl flex flex-col justify-between h-32 col-span-2 border border-premium/20">
                <span className="text-sm text-muted-foreground mb-2">Workspace Performance</span>
                <div className="flex items-end gap-2 h-full">
                  {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-premium/20 rounded-t-sm relative group cursor-pointer transition-all hover:bg-premium"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        ${h}k
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 14 Report Types */}
          <section className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">14 Unique Report Types</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Don't settle for generic dumps. We've crafted 14 specific reports tailored to agency
                accounting and capacity planning.
              </p>
              <ul className="space-y-3">
                {[
                  "Detailed Time Entry Log (Audit-ready)",
                  "Team Member Utilization & Capacity",
                  "Project Profitability & Margins",
                  "Uninvoiced Billable Hours Rollup",
                  "Time-Off and Leave Summaries"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full">
              <div className="glass-card border border-border/50 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 text-primary/10">
                  <PieChart className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
                      1
                    </div>
                    <span className="font-medium">Utilization by Department</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
                      2
                    </div>
                    <span className="font-medium">Project Margin Analysis</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">
                      3
                    </div>
                    <span className="font-medium">WIP (Work In Progress) Ledger</span>
                  </div>
                  <div className="text-center text-sm font-medium text-primary mt-2 cursor-pointer hover:underline">
                    + 11 more report types
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Export Wizard */}
          <section className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">The Export Wizard</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Your data belongs to you. Export payroll-ready formats for QuickBooks, Gusto, or
                generic CSVs with granular filtering.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" /> Export PDF
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full glass-card p-8 rounded-2xl border-l-4 border-l-muted-foreground">
              <h4 className="font-bold mb-4">Export Configuration</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                  <select className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none">
                    <option>Last Month (Oct 1 - Oct 31)</option>
                    <option>This Quarter</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Format</label>
                  <div className="flex gap-2">
                    <div className="flex-1 py-2 text-center border border-primary bg-primary/10 text-primary rounded-lg text-sm font-medium cursor-pointer">
                      CSV
                    </div>
                    <div className="flex-1 py-2 text-center border border-border bg-background rounded-lg text-sm font-medium cursor-pointer hover:bg-muted">
                      PDF
                    </div>
                    <div className="flex-1 py-2 text-center border border-border bg-background rounded-lg text-sm font-medium cursor-pointer hover:bg-muted">
                      Excel
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
