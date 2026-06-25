"use client";

import { ShieldCheck, BarChart4, Activity, ArrowRight, CalendarDays, Globe2, BrainCircuit, Webhook, Users, Smartphone } from "lucide-react";
import Link from "next/link";

export default function FeaturesHubPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-24">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The engine behind modern agencies.
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to track time, approve timesheets, and bill clients seamlessly—without the administrative overhead.
          </p>
        </div>

        {/* Feature Hub Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          
          {/* Reporting & Dashboards Card */}
          <Link href="/features/reporting-and-dashboards" className="group">
            <div className="glass-card h-full p-8 md:p-12 rounded-3xl border-2 border-transparent hover:border-premium/50 hover:shadow-2xl hover:shadow-premium/10 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-premium transform group-hover:scale-110 transition-transform">
                <BarChart4 size={160} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-premium/10 text-premium flex items-center justify-center mb-8 relative z-10">
                <BarChart4 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 relative z-10">Reporting & Dashboards</h2>
              <p className="text-lg text-muted-foreground mb-8 flex-1 relative z-10">
                Transform raw time data into actionable intelligence. Drill down into utilization, profitability, and cross-workspace rollups instantly. Includes 14 report types and our Export Wizard.
              </p>
              <div className="flex items-center text-premium font-bold relative z-10">
                Explore Analytics <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Calendar & Timezones Card */}
          <Link href="/features/calendar-and-timezones" className="group">
            <div className="glass-card h-full p-8 md:p-12 rounded-3xl border-2 border-transparent hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-primary transform group-hover:scale-110 transition-transform">
                <CalendarDays size={160} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8 relative z-10">
                <CalendarDays className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 relative z-10">Calendar & Timezones</h2>
              <p className="text-lg text-muted-foreground mb-8 flex-1 relative z-10">
                Built for distributed teams. Visualize your week with intuitive drag-and-drop, while we handle the complex global timezone conversions behind the scenes.
              </p>
              <div className="flex items-center text-primary font-bold relative z-10">
                Explore Calendar <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">

          {/* AI Features Card */}
          <Link href="/features" className="group">
            <div className="glass-card h-full p-8 md:p-12 rounded-3xl border-2 border-transparent hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-purple-500 transform group-hover:scale-110 transition-transform">
                <BrainCircuit size={160} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-8 relative z-10">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 relative z-10">AI Features</h2>
              <p className="text-lg text-muted-foreground mb-8 flex-1 relative z-10">
                Supercharge your workflow with intelligent timesheet suggestions, automated categorization, and deep reporting insights driven by AI.
              </p>
              <div className="flex items-center text-purple-500 font-bold relative z-10">
                Explore AI <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Integrations & API Card */}
          <Link href="/features" className="group">
            <div className="glass-card h-full p-8 md:p-12 rounded-3xl border-2 border-transparent hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-500 transform group-hover:scale-110 transition-transform">
                <Webhook size={160} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-8 relative z-10">
                <Webhook className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 relative z-10">Integrations & API</h2>
              <p className="text-lg text-muted-foreground mb-8 flex-1 relative z-10">
                Connect your existing tools with custom integrations. Fetch real-time data using our secure Reporting API keys tailored for power users.
              </p>
              <div className="flex items-center text-emerald-500 font-bold relative z-10">
                Explore API <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Multi-Workspace Management Card */}
          <Link href="/features" className="group">
            <div className="glass-card h-full p-8 md:p-12 rounded-3xl border-2 border-transparent hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 transform group-hover:scale-110 transition-transform">
                <Users size={160} />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-8 relative z-10">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 relative z-10">Multi-Workspace</h2>
              <p className="text-lg text-muted-foreground mb-8 flex-1 relative z-10">
                Scale your organization effortlessly. Manage multiple workspaces under a single tenant with distinct roles for admins and project managers.
              </p>
              <div className="flex items-center text-blue-500 font-bold relative z-10">
                Explore Workspaces <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </Link>

        </div>

        {/* Core Capabilities */}
        <div className="text-center mb-16">
          <h3 className="text-2xl font-bold">Core Capabilities</h3>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-success">
            <ShieldCheck className="w-8 h-8 text-success mb-4" />
            <h4 className="font-bold mb-2">Approval Workflows</h4>
            <p className="text-sm text-muted-foreground">Timesheets are routed hierarchically for review. Includes inline amendments and audit logs.</p>
          </div>
          
          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-red-500">
            <Activity className="w-8 h-8 text-red-500 mb-4" />
            <h4 className="font-bold mb-2">Live Presence (SSE)</h4>
            <p className="text-sm text-muted-foreground">See who is working right now with our real-time Server-Sent Events engine.</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-warning">
            <Globe2 className="w-8 h-8 text-warning mb-4" />
            <h4 className="font-bold mb-2">Global Normalization</h4>
            <p className="text-sm text-muted-foreground">Admins see reports in their timezone, members track in theirs. UTC normalized natively.</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-t-4 border-t-foreground">
            <Smartphone className="w-8 h-8 text-foreground mb-4" />
            <h4 className="font-bold mb-2">Mobile Experience</h4>
            <p className="text-sm text-muted-foreground">Track time, approve requests, and access insights on the go across any mobile device.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
