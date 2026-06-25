"use client";

import { Button } from "@kloqra/ui";
import {
  FilePenLine,
  Bot,
  Download,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Play,
  Pause,
  Square,
  CheckCircle2,
  TrendingUp,
  Zap,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

/* ─── Animated Timer Mockup ─── */
function TimerFeatureMockup() {
  const [seconds, setSeconds] = useState(8073);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="glass-card p-8 rounded-2xl border-l-4 border-l-primary relative overflow-hidden">
      <div className="absolute top-4 right-4 text-xs font-mono text-muted-foreground opacity-50">[Space] to stop</div>
      <div className="text-sm text-muted-foreground mb-1">API Redesign › Auth module</div>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px] ${running ? "bg-green-400 shadow-green-400/60 animate-pulse" : "bg-muted"}`} />
        <span className="font-mono text-5xl font-light tracking-tight">{fmt(seconds)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>Today: 6h 32m</span><span>Goal: 8h</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-primary to-premium rounded-full" style={{ width: "81%" }} />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex-1 py-2.5 rounded-lg bg-background border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
        </button>
        <button className="flex-1 py-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
          <Square className="w-4 h-4" /> Stop & Save
        </button>
      </div>
    </div>
  );
}

/* ─── Timesheet Calendar Mockup ─── */
function CalendarMockup() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = [8, 7.5, 9, 6, 8.5, 2, 0];
  const maxH = 9;
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-premium">
      <div className="flex items-center justify-between mb-6">
        <span className="font-bold">June 2025 · Week View</span>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-background border border-border">Day</span>
          <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">Week</span>
          <span className="px-2 py-1 rounded bg-background border border-border">Month</span>
        </div>
      </div>
      <div className="flex gap-2 items-end h-40">
        {days.map((d, i) => (
          <div key={d} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">{hours[i]}h</span>
            <div
              className={`w-full rounded-t-lg transition-all ${i === 3 ? "bg-warning/40 border border-warning/30" : i < 5 ? "bg-primary/30 hover:bg-primary/50" : "bg-muted/30"}`}
              style={{ height: `${(hours[i] / maxH) * 120}px` }}
            />
            <span className={`text-xs font-medium ${i === new Date().getDay() - 1 ? "text-primary" : "text-muted-foreground"}`}>{d}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/30 inline-block" />Logged</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-warning/40 inline-block" />Under goal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-muted/30 inline-block" />Weekend</span>
      </div>
    </div>
  );
}

/* ─── Projects Mockup ─── */
function ProjectsMockup() {
  const projects = [
    { name: "API Redesign", tasks: 12, done: 8, color: "primary" },
    { name: "Mobile App", tasks: 20, done: 15, color: "premium" },
    { name: "Design System", tasks: 7, done: 7, color: "success" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-success space-y-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">My Projects</span>
        <span className="text-xs text-muted-foreground">3 active</span>
      </div>
      {projects.map((p) => (
        <div key={p.name} className="bg-background/50 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-sm">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.done}/{p.tasks} tasks</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-${p.color}`}
              style={{ width: `${(p.done / p.tasks) * 100}%` }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            {["Design", "Backend", "Review"].slice(0, p.done === p.tasks ? 3 : 2).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Timesheet Submission Mockup ─── */
function TimesheetSubmitMockup() {
  const [status, setStatus] = useState<"draft" | "submitted" | "approved">("draft");
  const statuses: Array<"draft" | "submitted" | "approved"> = ["draft", "submitted", "approved"];
  const labels = { draft: "Draft", submitted: "Pending Review", approved: "Approved ✓" };
  const colors = { draft: "border-muted-foreground text-muted-foreground", submitted: "border-warning text-warning", approved: "border-success text-success" };

  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-warning">
      <div className="flex items-center justify-between mb-6">
        <span className="font-bold">June 2025 Timesheet</span>
        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${colors[status]}`}>{labels[status]}</span>
      </div>
      <div className="space-y-3 mb-6">
        {["API Redesign", "Design System", "Stand-ups"].map((item, i) => (
          <div key={item} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border/50">
            <span className="text-sm">{item}</span>
            <span className="font-mono text-sm text-muted-foreground">{["42h 0m", "12h 30m", "3h 0m"][i]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border mb-6">
        <span className="text-sm font-medium">Total Hours</span>
        <span className="font-mono font-bold">57h 30m</span>
      </div>
      <div className="flex gap-2">
        {statuses.map((s, i) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${status === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
          >
            {["Draft", "Submit", "View"][i]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Amendment Mockup ─── */
function AmendmentMockup() {
  const [sent, setSent] = useState(false);
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-purple-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
          <FilePenLine className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm">Request Amendment</div>
          <div className="text-xs text-muted-foreground">May 2025 · Approved timesheet</div>
        </div>
      </div>
      <div className="bg-background/50 p-4 rounded-xl border border-border mb-4">
        <div className="text-xs text-muted-foreground mb-2">Reason for amendment</div>
        <div className="text-sm text-foreground">{sent ? "Forgot to log 3h of client calls on May 14th." : "Forgot to log 3h of client calls on..."}</div>
      </div>
      <div className="space-y-2 mb-6">
        {[
          { label: "Entry", val: "May 14th – Client Meetings" },
          { label: "Correction", val: "+3h 00m" },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{val}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setSent(true)}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${sent ? "bg-success/10 text-success border border-success/20" : "bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20"}`}
      >
        {sent ? "✓ Amendment Sent to Manager" : "Send Amendment Request"}
      </button>
    </div>
  );
}

/* ─── Integrations Mockup ─── */
function IntegrationsMockup() {
  const integrations = [
    { name: "Jira", icon: "J", color: "bg-blue-500", desc: "2-way sync • Issues → Tasks" },
    { name: "Slack", icon: "S", color: "bg-emerald-500", desc: "Log time from messages" },
    { name: "MS Teams", icon: "T", color: "bg-indigo-500", desc: "Chat-based time logging" },
    { name: "Google Cal", icon: "G", color: "bg-yellow-500", desc: "Auto-fill from events" },
    { name: "Outlook", icon: "O", color: "bg-blue-600", desc: "Calendar sync" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-emerald-500">
      <div className="flex items-center justify-between mb-6">
        <span className="font-bold">Connected Integrations</span>
        <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">5 active</span>
      </div>
      <div className="space-y-3">
        {integrations.map((int) => (
          <div key={int.name} className="flex items-center justify-between bg-background/50 p-3 rounded-xl border border-border/50 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${int.color} flex items-center justify-center text-white font-bold text-sm`}>{int.icon}</div>
              <div>
                <div className="font-medium text-sm">{int.name}</div>
                <div className="text-xs text-muted-foreground">{int.desc}</div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px] shadow-success/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Analytics Mockup ─── */
function AnalyticsMockup() {
  const bars = [38, 52, 44, 60, 48, 72, 56];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-premium">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "This Week", value: "37h 40m", trend: "+4%", up: true },
          { label: "Utilization", value: "94%", trend: "+2%", up: true },
          { label: "Billable", value: "89%", trend: "-1%", up: false },
        ].map(({ label, value, trend, up }) => (
          <div key={label} className="bg-background/50 p-3 rounded-xl border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="font-bold text-sm mb-1">{value}</div>
            <div className={`text-xs flex items-center gap-1 ${up ? "text-success" : "text-red-400"}`}>
              <TrendingUp className="w-3 h-3" />{trend}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 items-end h-24 mb-3">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary/80 hover:from-primary/60 hover:to-primary transition-colors cursor-pointer"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bot className="w-3 h-3 text-purple-400" />
        <span className="text-purple-400">AI Insight:</span> You're most productive on Fridays. Consider scheduling deep work then.
      </div>
    </div>
  );
}

/* ─── Notifications Mockup ─── */
function NotificationsMockup() {
  const items = [
    { icon: "✅", title: "Timesheet Approved", sub: "Sarah K. approved your June timesheet", time: "2m ago", color: "text-success" },
    { icon: "💬", title: "Comment on Entry", sub: "You have a note on 'API Redesign' entry", time: "14m ago", color: "text-primary" },
    { icon: "⚠️", title: "Amendment Requested", sub: "May timesheet needs a correction", time: "1h ago", color: "text-warning" },
    { icon: "🔔", title: "Deadline Reminder", sub: "Submit timesheet by Friday 5 PM", time: "3h ago", color: "text-muted-foreground" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-warning">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold">Notifications</span>
        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">3 new</span>
      </div>
      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.title} className="flex items-start gap-3 bg-background/50 p-3 rounded-xl border border-border/50 hover:border-primary/20 transition-colors cursor-pointer">
            <span className="text-lg mt-0.5">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{n.title}</div>
              <div className="text-xs text-muted-foreground truncate">{n.sub}</div>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Profile Mockup ─── */
function ProfileMockup() {
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-blue-400">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-premium flex items-center justify-center text-white font-bold text-2xl">C</div>
        <div>
          <div className="font-bold">Chamal D.</div>
          <div className="text-sm text-muted-foreground">chamal@company.com</div>
          <div className="text-xs text-primary mt-1">Pro Plan · Workspace Member</div>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { label: "Timezone", value: "Asia/Colombo (UTC+5:30)" },
          { label: "Weekly Goal", value: "40 hours" },
          { label: "Language", value: "English" },
          { label: "Theme", value: "Dark Mode ✦" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center bg-background/50 px-4 py-2.5 rounded-lg border border-border/50">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── AI Assistant Mockup ─── */
function AssistantMockup() {
  const messages = [
    { from: "user", text: "How many hours did I log on API Redesign last week?" },
    { from: "ai", text: "You logged **23h 40m** on API Redesign last week — that's 63% of your total time. Your utilization was above goal by 3h. 🚀" },
    { from: "user", text: "Submit my timesheet for approval" },
    { from: "ai", text: "Done! Your June timesheet (57h 30m) has been submitted to Sarah K. for review. You'll get a notification once it's approved." },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-purple-500">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="font-bold text-sm">Kloqra AI Assistant</div>
          <div className="text-xs text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />Online</div>
        </div>
      </div>
      <div className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${m.from === "user" ? "bg-primary/10 text-primary border border-primary/20 rounded-tr-sm" : "bg-background/80 border border-border rounded-tl-sm text-foreground"}`}>
              {m.text.replace(/\*\*(.*?)\*\*/g, "$1")}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 bg-background/50 rounded-xl border border-border px-3 py-2.5">
        <input className="flex-1 bg-transparent text-xs outline-none text-muted-foreground" placeholder="Ask anything about your time..." readOnly />
        <Zap className="w-4 h-4 text-purple-400 shrink-0" />
      </div>
    </div>
  );
}

/* ─── Export Mockup ─── */
function ExportMockup() {
  const [fmt, setFmt] = useState("CSV");
  const [exported, setExported] = useState(false);
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-muted-foreground">
      <div className="font-bold mb-6">Export Your Time Data</div>
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Date Range</label>
          <select className="w-full bg-background border border-border rounded-lg p-2.5 text-sm outline-none">
            <option>June 2025 (current month)</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>Custom range…</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Format</label>
          <div className="flex gap-2">
            {["CSV", "PDF", "Excel"].map((f) => (
              <button
                key={f}
                onClick={() => { setFmt(f); setExported(false); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${fmt === f ? "bg-primary/10 text-primary border-primary/30" : "bg-background border-border hover:bg-muted"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => setExported(true)}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${exported ? "bg-success/10 text-success border border-success/20" : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"}`}
      >
        <Download className="w-4 h-4" />
        {exported ? `✓ ${fmt} file ready to download` : `Export as ${fmt}`}
      </button>
    </div>
  );
}

/* ─── Offline Mockup ─── */
function OfflineMockup() {
  const [online, setOnline] = useState(false);
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-slate-500">
      <div className="flex items-center justify-between mb-6">
        <span className="font-bold">Connection Status</span>
        <button
          onClick={() => setOnline((o) => !o)}
          className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${online ? "border-success text-success bg-success/10" : "border-red-400 text-red-400 bg-red-400/10"}`}
        >
          {online ? "● Online" : "○ Offline"}
        </button>
      </div>
      <div className="space-y-3 mb-6">
        {[
          { action: "Timer running", status: online ? "Synced" : "Cached locally", ok: true },
          { action: "Time entry saved", status: online ? "Synced" : "Queued (2 pending)", ok: online },
          { action: "Timesheet draft", status: online ? "Synced" : "Local cache", ok: true },
        ].map(({ action, status, ok }) => (
          <div key={action} className="flex items-center justify-between bg-background/50 px-4 py-3 rounded-xl border border-border/50">
            <span className="text-sm">{action}</span>
            <span className={`text-xs font-medium ${ok ? "text-success" : "text-warning"}`}>{status}</span>
          </div>
        ))}
      </div>
      <div className={`text-sm rounded-xl p-4 border ${online ? "bg-success/5 border-success/20 text-success" : "bg-muted/30 border-border text-muted-foreground"}`}>
        {online ? "✓ All changes synced to server. You're up to date." : "Working offline. All entries saved locally and will sync automatically when reconnected."}
      </div>
    </div>
  );
}

/* ─── SSO Mockup ─── */
function SSOMockup() {
  const [provider, setProvider] = useState<string | null>(null);
  const providers = [
    { name: "Google Workspace", color: "bg-white text-gray-700 border-gray-200", letter: "G", bg: "bg-red-500" },
    { name: "Okta", color: "bg-blue-50 text-blue-700 border-blue-200", letter: "O", bg: "bg-blue-600" },
    { name: "Azure AD", color: "bg-indigo-50 text-indigo-700 border-indigo-200", letter: "A", bg: "bg-indigo-600" },
  ];
  return (
    <div className="glass-card p-6 rounded-2xl border-l-4 border-l-indigo-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="font-bold text-sm">Enterprise SSO Login</div>
          <div className="text-xs text-muted-foreground">One click. Zero passwords.</div>
        </div>
      </div>
      <div className="space-y-3 mb-6">
        {providers.map((p) => (
          <button
            key={p.name}
            onClick={() => setProvider(p.name)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${provider === p.name ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "bg-background/50 border-border hover:border-indigo-500/30 hover:bg-muted"}`}
          >
            <div className={`w-7 h-7 rounded-lg ${p.bg} text-white flex items-center justify-center text-xs font-bold`}>{p.letter}</div>
            Continue with {p.name}
          </button>
        ))}
      </div>
      {provider && (
        <div className="bg-success/10 border border-success/20 text-success rounded-xl p-3 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Authenticated via {provider}
        </div>
      )}
    </div>
  );
}

/* ─── Feature Section Layout ─── */
function FeatureSection({
  id,
  badge,
  badgeColor,
  title,
  subtitle,
  bullets,
  mockup,
  reverse = false,
}: {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  bullets: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
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
export default function ForMembersPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[140px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-premium/15 rounded-full blur-[140px] mix-blend-screen pointer-events-none" />
        <div className="container mx-auto px-4 max-w-5xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Designed for every member of your team
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Your time,{" "}
            <span className="text-gradient">tracked automatically.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Stop fighting spreadsheets. Kloqra gives every team member a powerful, focused experience — built to get out of the way and let you do your best work.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="h-12 px-8 text-base bg-white text-black hover:bg-white/90">
              <Link href="http://localhost:3000/register">Start Free — No Credit Card</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base glass-card">
              <Link href="/pricing">View Plans <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />
      </div>

      {/* Feature Sections */}
      <div className="container mx-auto px-4 max-w-5xl space-y-24 pb-32">

        <FeatureSection
          id="timer"
          badge="⏱ Time Tracking"
          badgeColor="bg-primary/10 text-primary"
          title="Track time manually or with a live stopwatch — across every device."
          subtitle="One keyboard shortcut. That's all it takes to start capturing billable hours precisely. Kloqra's timer runs in the background while you focus on the actual work."
          bullets={[
            "Press Space to start and stop — no mouse needed",
            "Pause and resume without losing a single second",
            "Works seamlessly on desktop, tablet, and mobile",
            "Visual goal bar shows your daily progress at a glance",
          ]}
          mockup={<TimerFeatureMockup />}
        />

        <FeatureSection
          id="calendar"
          badge="📅 Timesheets"
          badgeColor="bg-premium/10 text-premium"
          title="Day, week, and month timesheet views — with advanced filtering."
          subtitle="Visualize your entire work history in a beautifully organized calendar. Spot under-logged days instantly and drill into individual entries with a single click."
          bullets={[
            "Switch between Day, Week, and Month in one click",
            "Color-coded entries by project for instant clarity",
            "Filter by project, category, or billing status",
            "Goal indicators warn you before you miss a target",
          ]}
          mockup={<CalendarMockup />}
          reverse
        />

        <FeatureSection
          id="projects"
          badge="📁 Projects & Tasks"
          badgeColor="bg-success/10 text-success"
          title="Manage and view assigned projects and tasks with granular detail."
          subtitle="Every time entry is tied to a real project and task — so your hours tell a story admins can bill against. You see exactly what you're responsible for and where you stand."
          bullets={[
            "See all active projects with real-time progress bars",
            "Tasks are assigned by your manager, scoped just for you",
            "Tag entries with categories for perfect billing accuracy",
            "Color-code projects your way for visual clarity",
          ]}
          mockup={<ProjectsMockup />}
        />

        <FeatureSection
          id="timesheets"
          badge="✅ Approvals"
          badgeColor="bg-warning/10 text-warning"
          title="Submit timesheets and track approval status in real-time."
          subtitle="No more emailing your manager to ask if your timesheet was approved. Kloqra gives you live visibility into every stage of the review workflow."
          bullets={[
            "Submit monthly or custom-period timesheets instantly",
            "Track Draft → Pending → Approved status in real-time",
            "Get notified the moment your manager takes action",
            "View a full audit trail of who approved what and when",
          ]}
          mockup={<TimesheetSubmitMockup />}
          reverse
        />

        <FeatureSection
          id="amendments"
          badge="✏️ Amendments"
          badgeColor="bg-purple-500/10 text-purple-400"
          title="Request amendments for already-approved timesheets — seamlessly."
          subtitle="Made a mistake after your timesheet was signed off? No problem. Send a structured amendment request to your manager without the awkward email chains."
          bullets={[
            "Request corrections on any locked or approved period",
            "Add a clear reason and specific entry changes",
            "Manager gets a focused review request — not a vague email",
            "Amendment history is fully audit-logged",
          ]}
          mockup={<AmendmentMockup />}
        />

        <FeatureSection
          id="integrations"
          badge="🔌 Integrations"
          badgeColor="bg-emerald-500/10 text-emerald-400"
          title="Jira, Slack, Teams, Google Calendar, Outlook — all connected."
          subtitle="Stop context-switching. Kloqra plugs directly into every tool your team already uses, so logging time feels effortless and automatic."
          bullets={[
            "Native Jira 2-way sync: Issues become tasks automatically",
            "Log time directly from a Slack or Teams message",
            "Google Calendar events auto-fill your timesheet",
            "Outlook meetings mapped to billable time entries",
            "Enterprise API keys for custom data pipelines",
          ]}
          mockup={<IntegrationsMockup />}
          reverse
        />

        <FeatureSection
          id="analytics"
          badge="📊 Analytics"
          badgeColor="bg-premium/10 text-premium"
          title="Personal analytics dashboard powered by AI-driven insights."
          subtitle="Your own private window into your productivity. See trends, spot patterns, and get intelligent nudges from the AI assistant — all without sharing your data with anyone else."
          bullets={[
            "Weekly, monthly, and quarterly personal summaries",
            "Utilization rate and billable vs. non-billable split",
            "AI-powered productivity insights and recommendations",
            "Compare your performance against your own past benchmarks",
          ]}
          mockup={<AnalyticsMockup />}
        />

        <FeatureSection
          id="notifications"
          badge="🔔 Notifications"
          badgeColor="bg-warning/10 text-warning"
          title="Real-time, multi-channel notifications — so nothing slips through."
          subtitle="Timesheet approved? Amendment needed? Deadline approaching? Kloqra pushes the right alert to the right channel at exactly the right time."
          bullets={[
            "In-app, email, Slack, and Teams notification channels",
            "Approval and rejection alerts with one-click actions",
            "Smart reminders before submission deadlines",
            "Fully customizable per-notification preferences",
          ]}
          mockup={<NotificationsMockup />}
          reverse
        />

        <FeatureSection
          id="profile"
          badge="👤 Profile"
          badgeColor="bg-blue-400/10 text-blue-400"
          title="Manage your profile, preferences, and timezone settings."
          subtitle="Your personal workspace adapts to you — not the other way around. Configure your timezone, work schedule goals, language, and visual preferences once and forget about it."
          bullets={[
            "Per-user timezone: work logged in your local time, stored in UTC",
            "Set a weekly hour goal and track it every day",
            "Dark Mode, language, and accessibility preferences",
            "Manage connected apps and revoke access at any time",
          ]}
          mockup={<ProfileMockup />}
        />

        <FeatureSection
          id="assistant"
          badge="🤖 AI Assistant"
          badgeColor="bg-purple-500/10 text-purple-400"
          title="Chat with the intelligent AI Assistant for workflow automation."
          subtitle="Ask questions, get instant answers, and automate repetitive tasks — all in plain English. The AI assistant knows your projects, your hours, and your history."
          bullets={[
            "Ask 'How many hours did I log this week?' in plain English",
            "Trigger timesheet submission from the chat window",
            "Get summaries of your time by project or category",
            "AI proactively flags anomalies and missing entries",
          ]}
          mockup={<AssistantMockup />}
          reverse
        />

        <FeatureSection
          id="export"
          badge="📤 Exports"
          badgeColor="bg-muted text-muted-foreground"
          title="Export personal time data — CSV, PDF, Excel, your call."
          subtitle="Your data belongs to you. Download it in any format, for any date range, with full granularity. Perfect for contractors who bill their own invoices."
          bullets={[
            "Export to CSV, PDF, or Excel in seconds",
            "Filter by project, client, category, or date range",
            "Scheduled auto-exports to your email or cloud storage",
            "Payroll-ready formats compatible with QuickBooks and Xero",
          ]}
          mockup={<ExportMockup />}
        />

        <FeatureSection
          id="offline"
          badge="📶 Offline Mode"
          badgeColor="bg-slate-500/10 text-slate-400"
          title="Work offline — local caching with automatic sync when reconnected."
          subtitle="Bad WiFi on a client site? On a plane? The timer keeps running, entries keep saving, and everything syncs the moment you're back online — completely automatically."
          bullets={[
            "Timer continues running with no internet connection",
            "All time entries cached locally in IndexedDB",
            "Conflict-free sync when connection is restored",
            "Visual indicator shows pending sync queue",
          ]}
          mockup={<OfflineMockup />}
          reverse
        />

        <FeatureSection
          id="sso"
          badge="🔐 Enterprise SSO"
          badgeColor="bg-indigo-500/10 text-indigo-400"
          title="Log in securely via Enterprise SSO — Okta, Azure AD, Google Workspace."
          subtitle="Enterprise teams get enterprise-grade security without the enterprise hassle. One click to authenticate, zero passwords to remember, and IT is happy."
          bullets={[
            "SAML 2.0 and OAuth 2.0 support out of the box",
            "Works with Okta, Azure Active Directory, Google Workspace",
            "Automatic account provisioning via SCIM",
            "Session management with admin-controlled timeout policies",
          ]}
          mockup={<SSOMockup />}
        />
      </div>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to stop chasing timesheets?</h2>
          <p className="text-xl text-muted-foreground mb-10">14-day free trial · No credit card · Cancel anytime</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90">
              <Link href="http://localhost:3000/register">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-10 text-lg glass-card">
              <Link href="/pricing">See Pricing <ChevronRight className="ml-1 w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
