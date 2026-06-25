"use client";

import { Button } from "@kloqra/ui";
import {
  Users,
  FolderKanban,
  Download,
  Settings2,
  Search,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Clock,
  UserPlus,
  FileSpreadsheet,
  Lock,
  Coins,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

/* ─── Dashboard KPI + Widget Mockup ─── */
function DashboardMockup() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const kpis = [
    { label: "Total Hours", value: "1,284h", sub: "this month", icon: Clock, color: "text-primary" },
    { label: "Billable", value: "$48,200", sub: "revenue", icon: DollarSign, color: "text-success" },
    { label: "Active Projects", value: "14", sub: "workspaces", icon: FolderKanban, color: "text-premium" },
    { label: "Active Members", value: "32", sub: "tracking now", icon: Users, color: "text-warning" },
  ];
  const bars = [42, 68, 55, 80, 63, 91, 74];
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-premium space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">Command Dashboard</span>
        <div className="flex gap-1">
          {["Week", "Month", "Quarter"].map((p, i) => (
            <button key={p} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${i === 1 ? "bg-primary/10 text-primary border-primary/30" : "border-border bg-background hover:bg-muted"}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-background/60 rounded-xl p-3.5 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div className="bg-background/60 rounded-xl p-4 border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium">Weekly Activity</span>
          <span className="text-[10px] text-muted-foreground">↑ 12% vs last week</span>
        </div>
        <div className="flex gap-1.5 items-end h-16">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-primary/30 to-primary/70 hover:from-primary/50 hover:to-primary transition-colors cursor-pointer"
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] text-muted-foreground">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live timer count */}
      <div className="flex items-center justify-between bg-success/5 border border-success/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px] shadow-success/50" />
          <span className="font-medium text-success">7 members tracking live</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")} elapsed
        </span>
      </div>
    </div>
  );
}

/* ─── Live Presence Mockup ─── */
function PresenceMockup() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const members = [
    { name: "Chamal D.", project: "API Redesign", task: "Auth module", base: 8040, active: true, color: "bg-blue-500" },
    { name: "Sarah K.", project: "Mobile App", task: "UI Components", base: 3720, active: true, color: "bg-purple-500" },
    { name: "Alex M.", project: "Design Review", task: "Figma audit", base: 2700, active: true, color: "bg-emerald-500" },
    { name: "Jamie L.", project: "—", task: "Not tracking", base: 0, active: false, color: "bg-muted" },
    { name: "Priya N.", project: "Backend API", task: "Database layer", base: 5400, active: true, color: "bg-orange-500" },
  ];

  const fmt = (base: number) => {
    const total = base + tick;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-success">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
        <span className="font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Live Team Presence
        </span>
        <span className="text-xs text-muted-foreground bg-success/10 text-success px-2 py-0.5 rounded-full">4 of 8 active</span>
      </div>
      <div className="space-y-1">
        {members.map((m) => (
          <div key={m.name} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-background/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg ${m.active ? m.color : "bg-muted"} flex items-center justify-center text-white text-xs font-bold`}>
                {m.name[0]}
              </div>
              <div>
                <div className={`text-sm font-medium ${!m.active ? "text-muted-foreground" : ""}`}>{m.name}</div>
                <div className="text-[10px] text-muted-foreground">{m.active ? `${m.project} · ${m.task}` : "Not tracking"}</div>
              </div>
            </div>
            {m.active && (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmt(m.base)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Approvals Mockup ─── */
function ApprovalsMockup() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const timesheets = [
    { name: "Chamal D.", period: "June 2025", hours: "57h 30m", status: "pending" },
    { name: "Sarah K.", period: "June 2025", hours: "42h 0m", status: "pending" },
    { name: "Alex M.", period: "June 2025", hours: "38h 15m", status: "pending" },
  ];
  const tabs = ["Pending (3)", "Missing (2)", "Amendments (1)", "Approved"];

  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-warning">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} className={`text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap border transition-colors ${i === 0 ? "bg-warning/10 text-warning border-warning/30" : "border-border bg-background hover:bg-muted text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      {/* Timesheet cards */}
      <div className="space-y-3">
        {timesheets.map((t) => {
          const s = statuses[t.name];
          return (
            <div key={t.name} className="bg-background/60 rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{t.name[0]}</div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">{t.period} · {t.hours}</div>
                  </div>
                </div>
                {s ? (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${s === "approved" ? "bg-success/10 text-success" : "bg-red-500/10 text-red-400"}`}>
                    {s === "approved" ? "✓ Approved" : "✗ Rejected"}
                  </span>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => setStatuses(p => ({ ...p, [t.name]: "rejected" }))} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20 transition-colors">Reject</button>
                    <button onClick={() => setStatuses(p => ({ ...p, [t.name]: "approved" }))} className="px-3 py-1 rounded-lg bg-success/10 text-success border border-success/20 text-xs hover:bg-success/20 transition-colors">Approve</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-center text-xs text-muted-foreground">Missing timesheets: <span className="text-warning font-medium">2 members haven't submitted</span></div>
    </div>
  );
}

/* ─── Projects Mockup ─── */
function ProjectsMockup() {
  const projects = [
    { name: "API Redesign", budget: 80, spent: 62, members: 5, revenue: "$12,400", health: "good" },
    { name: "Mobile App", budget: 120, spent: 104, members: 8, revenue: "$20,800", health: "warning" },
    { name: "Design System", budget: 40, spent: 18, members: 3, revenue: "$3,600", health: "good" },
  ];
  const healthColor = { good: "bg-success", warning: "bg-warning", danger: "bg-red-500" };

  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-primary">
      <div className="flex items-center justify-between mb-5">
        <span className="font-bold">Project Health Matrix</span>
        <button className="text-xs text-primary hover:underline flex items-center gap-1">New Project <ChevronRight className="w-3 h-3" /></button>
      </div>
      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.name} className="bg-background/60 rounded-xl border border-border/50 p-4 hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.members} members · {p.revenue} revenue</div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${healthColor[p.health as keyof typeof healthColor]}`} />
            </div>
            {/* Budget burndown */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Budget burn-down</span>
                <span>{p.spent}h / {p.budget}h</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${p.health === "warning" ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${(p.spent / p.budget) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Team Management Mockup ─── */
function TeamMockup() {
  const [invited, setInvited] = useState(false);
  const members = [
    { name: "Chamal D.", role: "Admin", hours: "57h", status: "active" },
    { name: "Sarah K.", role: "Member", hours: "42h", status: "active" },
    { name: "Alex M.", role: "Member", hours: "38h", status: "active" },
    { name: "new@company.com", role: "Member", hours: "—", status: "invited" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-blue-400">
      <div className="flex items-center justify-between mb-5">
        <span className="font-bold">Team Management</span>
        <button
          onClick={() => setInvited(true)}
          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${invited ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"}`}
        >
          <UserPlus className="w-3 h-3" />
          {invited ? "Invited!" : "Invite Member"}
        </button>
      </div>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.name} className="flex items-center justify-between bg-background/60 px-4 py-3 rounded-xl border border-border/50 hover:border-blue-400/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${m.status === "invited" ? "bg-muted text-muted-foreground border border-dashed border-border" : "bg-blue-500/20 text-blue-400"}`}>
                {m.status === "invited" ? "?" : m.name[0]}
              </div>
              <div>
                <div className={`text-sm ${m.status === "invited" ? "text-muted-foreground italic" : "font-medium"}`}>{m.name}</div>
                <div className="text-[10px] text-muted-foreground">{m.role} · {m.hours} this month</div>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.status === "invited" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
              {m.status === "invited" ? "Invited" : "Active"}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 text-center bg-background/60 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
          📤 Bulk CSV import
        </div>
        <div className="flex-1 text-center bg-background/60 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
          👤 View-as member
        </div>
      </div>
    </div>
  );
}

/* ─── Exports / Invoice Wizard Mockup ─── */
function ExportsMockup() {
  const [mode, setMode] = useState<"quick" | "custom" | "invoice">("quick");
  const [done, setDone] = useState(false);
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-muted-foreground">
      <div className="font-bold mb-5">Export & Invoice Wizard</div>
      <div className="flex gap-1 mb-5">
        {(["quick", "custom", "invoice"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setDone(false); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${mode === m ? "bg-primary/10 text-primary border-primary/30" : "bg-background border-border hover:bg-muted"}`}
          >{m}</button>
        ))}
      </div>

      {mode === "quick" && (
        <div className="space-y-3">
          <div className="bg-background/60 border border-border rounded-xl p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Date Range</div>
            <select className="w-full bg-transparent text-sm outline-none">
              <option>June 2025 (current month)</option>
              <option>Last Month</option>
            </select>
          </div>
          <div className="flex gap-2">
            {["CSV", "PDF", "Excel"].map((f) => (
              <button key={f} onClick={() => setDone(true)} className="flex-1 py-2 rounded-lg text-xs border border-border bg-background hover:bg-muted transition-colors flex items-center justify-center gap-1">
                <Download className="w-3 h-3" /> {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-3 text-xs">
          {[
            { label: "Scope", options: ["All Members", "Project: API Redesign", "Team: Backend"] },
            { label: "Group by", options: ["Project", "Member", "Category", "Task"] },
          ].map(({ label, options }) => (
            <div key={label} className="bg-background/60 border border-border rounded-xl p-3">
              <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
              <select className="w-full bg-transparent text-sm outline-none">
                {options.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button onClick={() => setDone(true)} className="w-full py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors text-xs font-medium">Preview & Export</button>
        </div>
      )}

      {mode === "invoice" && (
        <div className="space-y-3">
          <div className="bg-background/60 border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Client</span><span className="font-medium">Acme Corp.</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Billable Hours</span><span className="font-medium">84h 30m</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Rate</span><span className="font-medium">$120/hr</span></div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between text-sm font-bold"><span>Invoice Total</span><span className="text-success">$10,140.00</span></div>
          </div>
          <button onClick={() => setDone(true)} className="w-full py-2.5 rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors text-xs font-medium flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Generate Invoice PDF
          </button>
        </div>
      )}

      {done && (
        <div className="mt-3 text-xs text-success bg-success/10 border border-success/20 rounded-xl p-3 text-center">✓ Export ready — download starting…</div>
      )}
    </div>
  );
}

/* ─── Workspace Settings Mockup ─── */
function WorkspaceMockup() {
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-emerald-500">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="font-bold">Workspace Configuration</div>
          <div className="text-xs text-muted-foreground">Affects all members</div>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { label: "Timezone", value: "Asia/Colombo (UTC+5:30)" },
          { label: "Timesheet Period", value: "Monthly" },
          { label: "Weekly Goal", value: "40 hours" },
          { label: "Daily Target", value: "8 hours" },
          { label: "Time Rounding", value: "15-minute intervals" },
          { label: "Week Start", value: "Monday" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between bg-background/60 px-4 py-2.5 rounded-xl border border-border/50">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-medium">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
        <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs">J</div>
        <div>
          <div className="text-xs font-medium">Jira Integration</div>
          <div className="text-[10px] text-success">Connected · 3 projects synced</div>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-success shadow-[0_0_8px] shadow-success/50" />
      </div>
    </div>
  );
}

/* ─── Categories Mockup ─── */
function CategoriesMockup() {
  const cats = [
    { name: "Development", billable: true, hours: "482h", color: "bg-blue-500" },
    { name: "Design", billable: true, hours: "218h", color: "bg-purple-500" },
    { name: "Meetings", billable: false, hours: "96h", color: "bg-orange-500" },
    { name: "Research", billable: true, hours: "64h", color: "bg-emerald-500" },
    { name: "Admin", billable: false, hours: "38h", color: "bg-muted" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-orange-500">
      <div className="flex items-center justify-between mb-5">
        <span className="font-bold">Work Categories</span>
        <button className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3" /> Bulk Import
        </button>
      </div>
      <div className="space-y-2.5">
        {cats.map((c) => (
          <div key={c.name} className="flex items-center gap-3 bg-background/60 px-4 py-3 rounded-xl border border-border/50 hover:border-orange-500/30 transition-colors">
            <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
            <span className="flex-1 text-sm font-medium">{c.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.billable ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {c.billable ? "Billable" : "Non-billable"}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{c.hours}</span>
          </div>
        ))}
      </div>
      {/* mini donut */}
      <div className="mt-4 flex items-center gap-3 bg-background/60 border border-border rounded-xl p-3">
        <div className="relative w-10 h-10 shrink-0">
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-success" strokeDasharray="76 88" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="text-success font-bold">86%</span> of all hours are billable this month
        </div>
      </div>
    </div>
  );
}

/* ─── Global Search Mockup ─── */
function GlobalSearchMockup() {
  const [query, setQuery] = useState("API");
  const results = [
    { type: "project", icon: "📁", label: "API Redesign", sub: "14 members · 284h logged" },
    { type: "member", icon: "👤", label: "Alex M. — API Lead", sub: "38h this month · Active now" },
    { type: "task", icon: "✅", label: "Auth module refactor", sub: "API Redesign · Chamal D." },
    { type: "member", icon: "👤", label: "Sam T. — API Developer", sub: "22h this month" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-indigo-500">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="font-bold">Global Search</div>
          <div className="text-xs text-muted-foreground">Cmd+K · Members, Projects, Tasks</div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5 mb-4">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
          placeholder="Search anything…"
        />
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</span>
      </div>
      <div className="space-y-1.5">
        {results.map((r) => (
          <div key={r.label} className="flex items-center gap-3 bg-background/60 px-3 py-2.5 rounded-xl border border-border/50 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-colors cursor-pointer">
            <span className="text-base">{r.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Billing & Subscription Mockup ─── */
function BillingMockup() {
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-premium">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-premium/10 flex items-center justify-center">
          <Coins className="w-5 h-5 text-premium" />
        </div>
        <div>
          <div className="font-bold">Billing & Subscription</div>
          <div className="text-xs text-muted-foreground">Manage your plan and seats</div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-premium/10 to-primary/10 border border-premium/20 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold text-lg">Enterprise Plan</div>
            <div className="text-xs text-muted-foreground">Billed annually · Next renewal Jul 1</div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-success/10 text-success border border-success/20 rounded-full font-medium">Active</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Seats Used", value: "32 / 100" },
            { label: "Workspaces", value: "4 / 25" },
            { label: "API Keys", value: "3 / 50" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center bg-background/40 rounded-lg p-2">
              <div className="text-xs font-bold">{value}</div>
              <div className="text-[9px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Dedicated account manager", icon: "👤" },
          { label: "Custom integrations", icon: "🔌" },
          { label: "Enterprise SLAs", icon: "🛡️" },
          { label: "Priority support queue", icon: "⚡" },
        ].map(({ label, icon }) => (
          <div key={label} className="flex items-center gap-2.5 text-sm">
            <span>{icon}</span>
            <span className="text-muted-foreground">{label}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Reporting API Mockup ─── */
function ReportingApiMockup() {
  const [copied, setCopied] = useState(false);
  const key = "kra_live_7x9mQp2nRsT4vW8kLzY6jF3dA1bE5cH0";
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-slate-500">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <div className="font-bold">Reporting API Keys</div>
          <div className="text-xs text-muted-foreground">Pull live data into your BI tools</div>
        </div>
      </div>
      <div className="bg-background rounded-xl border border-border p-4 mb-4 font-mono text-xs">
        <div className="text-muted-foreground mb-1">GET /api/v1/report/hours</div>
        <div className="text-success">Authorization: Bearer {key.slice(0, 20)}…</div>
      </div>
      <button
        onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className={`w-full py-2.5 rounded-xl text-xs font-medium border transition-colors mb-4 ${copied ? "bg-success/10 text-success border-success/20" : "bg-background border-border hover:bg-muted"}`}
      >
        {copied ? "✓ API Key Copied!" : "Copy API Key"}
      </button>
      <div className="space-y-2">
        {[
          { label: "Endpoints", value: "Hours, Members, Projects, Revenue" },
          { label: "Formats", value: "JSON, CSV stream" },
          { label: "Rate Limit", value: "1000 req / hour" },
          { label: "Keys", value: "3 of 50 active" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature Section Layout ─── */
function FeatureSection({
  id, badge, badgeColor, title, subtitle, bullets, mockup, reverse = false,
}: {
  id: string; badge: string; badgeColor: string; title: string; subtitle: string;
  bullets: string[]; mockup: React.ReactNode; reverse?: boolean;
}) {
  return (
    <section id={id} className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-16 py-8`}>
      <div className="flex-1 space-y-6">
        <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full tracking-widest uppercase ${badgeColor}`}>{badge}</span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">{title}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 w-full">{mockup}</div>
    </section>
  );
}

/* ─── Page ─── */
export default function ForAdminsPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-premium/15 rounded-full blur-[140px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[140px] mix-blend-screen pointer-events-none" />
        <div className="container mx-auto px-4 max-w-5xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-premium/30 bg-premium/10 px-4 py-2 text-sm text-premium mb-8">
            <span className="w-2 h-2 rounded-full bg-premium animate-pulse" />
            Built for Workspace Admins & Org Leaders
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Full visibility.{" "}
            <span className="text-gradient">Zero chasing.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            A complete command center for running your team. Approve timesheets, track live activity, drill into project financials, and export payroll-ready reports — all from a single, beautiful dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="h-12 px-8 text-base bg-white text-black hover:bg-white/90">
              <Link href="http://localhost:3000/register">Start Free — No Credit Card</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base glass-card">
              <Link href="/pricing">See Enterprise Pricing <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />
      </div>

      {/* Feature Sections */}
      <div className="container mx-auto px-4 max-w-5xl space-y-24 pb-32">

        <FeatureSection
          id="dashboard"
          badge="📊 Command Dashboard"
          badgeColor="bg-premium/10 text-premium"
          title="A fully customizable command dashboard — 27 widgets, your layout."
          subtitle="Your workspace at a glance. Drag, drop, resize, and save the exact dashboard that matters to your business. From revenue KPIs to live presence feeds, everything updates in real-time."
          bullets={[
            "27 configurable widgets across 6 groups: KPIs, Trends, Composition, Projects, Team, Workflow",
            "Drag-and-drop layout saved per-user with react-grid-layout",
            "Shareable widget links — send a chart snapshot to stakeholders instantly",
            "Real-time KPIs: total hours, billable revenue, active members, active projects",
            "14 report types: utilization, profitability, WIP ledger, uninvoiced hours, and more",
          ]}
          mockup={<DashboardMockup />}
        />

        <FeatureSection
          id="presence"
          badge="🔴 Live Presence"
          badgeColor="bg-success/10 text-success"
          title="See who's working — right now, in real-time."
          subtitle="Know instantly who is tracking time, what project they're on, and how long they've been at it. Powered by Server-Sent Events, the feed updates live without a single page refresh."
          bullets={[
            "Real-time SSE feed: no polling, no stale data",
            "See member name, project, task, and elapsed time per entry",
            "Instantly spot who hasn't started their day or gone idle",
            "Live timer counter widget embeddable in your main dashboard",
          ]}
          mockup={<PresenceMockup />}
          reverse
        />

        <FeatureSection
          id="approvals"
          badge="✅ Timesheet Approvals"
          badgeColor="bg-warning/10 text-warning"
          title="Approve, reject, and track timesheets across your entire team."
          subtitle="A structured, multi-tab workflow for managing every stage of timesheet review. One-click approvals, inline amendments, automated reminders for missing submissions — it all flows through one page."
          bullets={[
            "5 workflow tabs: Pending Review, Missing, Amendments, Approved, Rejected",
            "Bulk approve multiple timesheets with a single action",
            "Automated reminder emails to members who haven't submitted",
            "Inline amendment review: see the delta, approve or push back with a note",
            "Full audit trail with timestamps for every approval action",
          ]}
          mockup={<ApprovalsMockup />}
        />

        <FeatureSection
          id="projects"
          badge="📁 Project Analytics"
          badgeColor="bg-primary/10 text-primary"
          title="Track every project's health, budget, and profitability."
          subtitle="Manage projects end-to-end — create them, assign teams, set hourly rates and budgets, then watch the burn-down in real-time. Catch overruns before they become problems."
          bullets={[
            "Budget burn-down progress with configurable alert thresholds",
            "Revenue by project: compare billing across your entire portfolio",
            "Project health matrix: hours, budget progress, and margin in one view",
            "Rate efficiency scatter chart: hours vs revenue vs billability",
            "Per-project team tab: assign and manage membership with roles",
          ]}
          mockup={<ProjectsMockup />}
          reverse
        />

        <FeatureSection
          id="team"
          badge="👥 Team Management"
          badgeColor="bg-blue-400/10 text-blue-400"
          title="Invite, manage, and impersonate team members at scale."
          subtitle="Complete control over your workspace roster. Invite individually or bulk-import hundreds via CSV. Set roles, manage rates, and use the view-as feature to debug any member's exact experience."
          bullets={[
            "Invite members individually or bulk-import via CSV spreadsheet",
            "Set workspace roles: Admin or Member — with scoped permissions",
            "View-as (impersonation) to see exactly what any member sees",
            "Last-active timestamps and weekly hours at a glance",
            "Manage hourly rates per member or per project for precise billing",
          ]}
          mockup={<TeamMockup />}
        />

        <FeatureSection
          id="exports"
          badge="📤 Exports & Invoicing"
          badgeColor="bg-muted text-muted-foreground"
          title="Export payroll-ready reports and generate client invoices."
          subtitle="Three modes built for every output: Quick for instant downloads, Custom for granular filtering, and Invoice Wizard for client-ready PDFs with calculated totals. Your data, your format."
          bullets={[
            "Quick Export: one-click CSV/PDF/Excel for any date range",
            "Custom Export: filter by member, project, category, task, and billing type",
            "Invoice Wizard: generates formatted client invoices with calculated billable totals",
            "Saved export presets: configure once, re-run on a schedule",
            "Export history panel: re-download any past export job",
          ]}
          mockup={<ExportsMockup />}
          reverse
        />

        <FeatureSection
          id="workspace"
          badge="⚙️ Workspace Settings"
          badgeColor="bg-emerald-500/10 text-emerald-400"
          title="Configure your workspace — timezone, rounding, periods, and Jira."
          subtitle="Set the rules for your entire team in one place. From timesheet submission periods to time-rounding precision, every setting cascades to all members automatically."
          bullets={[
            "Workspace timezone: all member entries normalized to your admin timezone",
            "Configurable timesheet periods: daily, weekly, or monthly",
            "Time rounding: snap entries to 5, 10, or 15-minute intervals",
            "Expected weekly hours and daily targets per workspace",
            "Native Jira integration: connect your site, map projects, auto-create tasks",
          ]}
          mockup={<WorkspaceMockup />}
        />

        <FeatureSection
          id="categories"
          badge="🏷️ Work Categories"
          badgeColor="bg-orange-500/10 text-orange-400"
          title="Define billable and non-billable categories for every entry."
          subtitle="Categories are the backbone of accurate billing. Create your taxonomy, mark each as billable or not, bulk-import from a spreadsheet, and watch the billability gauge update across your dashboard."
          bullets={[
            "Unlimited custom work categories: Development, Design, Meetings, Admin, etc.",
            "Mark categories as billable or non-billable — affects all reports instantly",
            "Bulk CSV import to set up hundreds of categories in seconds",
            "Category × Project heatmap: see exactly where time is going at the intersection level",
            "Category distribution donut widget on the main dashboard",
          ]}
          mockup={<CategoriesMockup />}
          reverse
        />

        <FeatureSection
          id="search"
          badge="🔍 Global Search"
          badgeColor="bg-indigo-500/10 text-indigo-400"
          title="Cmd+K to search members, projects, and tasks — instantly."
          subtitle="No more navigating through menus. Hit Cmd+K anywhere in the admin app and search across your entire workspace. Jump straight to a member's profile, a project's overview, or a specific task."
          bullets={[
            "Cmd+K keyboard shortcut launches the search dialog instantly",
            "Searches across members, projects, tasks simultaneously",
            "Navigates directly to the exact record — no extra clicks",
            "Results show key context: hours, status, role, last active",
          ]}
          mockup={<GlobalSearchMockup />}
        />

        <FeatureSection
          id="billing"
          badge="💳 Billing & Plans"
          badgeColor="bg-premium/10 text-premium"
          title="Manage your subscription, seats, and enterprise entitlements."
          subtitle="Full control over your Kloqra plan. See seat usage, workspace capacity, and API key allocation at a glance. Upgrade, downgrade, or contact your dedicated account manager directly from the billing page."
          bullets={[
            "Real-time seat, workspace, and API key usage meters",
            "Instant plan upgrades: Starter → Pro → Enterprise with zero downtime",
            "Dedicated account manager for Enterprise customers",
            "Invoice history and downloadable PDF receipts",
            "Organization-level billing with workspace-level cost allocation",
          ]}
          mockup={<BillingMockup />}
          reverse
        />

        <FeatureSection
          id="api"
          badge="🔐 Reporting API"
          badgeColor="bg-slate-500/10 text-slate-400"
          title="Pull live data into Tableau, Power BI, or any BI tool via API."
          subtitle="Enterprise teams need their data in their own systems. Generate API keys that give your data pipeline read access to hours, revenue, members, and projects — with rate limiting and key rotation built in."
          bullets={[
            "Up to 50 API keys on Enterprise (3 on Pro, 5 on Starter)",
            "Endpoints for hours, members, projects, categories, and revenue",
            "JSON and streaming CSV response formats",
            "Per-key rate limiting and automatic expiry management",
            "Integrates directly with Tableau, Power BI, Looker, and custom ETL pipelines",
          ]}
          mockup={<ReportingApiMockup />}
        />

      </div>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 bg-premium/5" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to take control of your team's time?</h2>
          <p className="text-xl text-muted-foreground mb-10">14-day free trial · No credit card · Cancel anytime</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90">
              <Link href="http://localhost:3000/register">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-10 text-lg glass-card">
              <Link href="/pricing">View Plans <ChevronRight className="ml-1 w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
