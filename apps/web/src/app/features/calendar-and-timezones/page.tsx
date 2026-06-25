"use client";

import { ArrowLeft, CalendarDays, Globe2, BellRing, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function CalendarTimezonesPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href="/features" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-12 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </Link>
        
        <div className="text-center mb-24">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-full mb-6">
            <CalendarDays className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Calendar & Timezones
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built for distributed teams. Visualize your week with intuitive drag-and-drop, while we handle the complex global timezone conversions behind the scenes.
          </p>
        </div>

        <div className="space-y-32">
          {/* Calendar View */}
          <section className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">Visual Time Blocking</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Ditch the spreadsheets. Our Day, Week, and Month views let you drag, drop, and stretch time blocks visually.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Drag-and-drop to adjust duration",
                  "Click and drag to create new entries",
                  "Color-coded by project and client",
                  "Daily and weekly total rollups"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full glass-card p-4 rounded-2xl border border-border/50">
              {/* Mock Calendar UI */}
              <div className="flex border-b border-border pb-2 mb-2 text-sm font-medium text-muted-foreground text-center">
                <div className="flex-1">Mon 12</div>
                <div className="flex-1 text-primary">Tue 13</div>
                <div className="flex-1">Wed 14</div>
              </div>
              <div className="relative h-48 border-l border-border ml-8">
                {/* Time labels */}
                <div className="absolute -left-8 text-xs text-muted-foreground top-0">9 AM</div>
                <div className="absolute -left-8 text-xs text-muted-foreground top-24">12 PM</div>
                
                {/* Grid lines */}
                <div className="absolute w-full border-t border-border/30 top-12" />
                <div className="absolute w-full border-t border-border/30 top-24" />
                <div className="absolute w-full border-t border-border/30 top-36" />

                {/* Blocks */}
                <div className="absolute top-4 left-[5%] w-[25%] h-16 bg-primary/20 border border-primary/50 rounded flex flex-col justify-center items-center text-[10px] text-primary cursor-pointer hover:bg-primary/30 transition-colors">
                  <span className="font-bold">Sync</span>
                  <span>1.5h</span>
                </div>
                
                <div className="absolute top-12 left-[38%] w-[25%] h-24 bg-success/20 border border-success/50 rounded flex flex-col justify-center items-center text-[10px] text-success cursor-pointer hover:bg-success/30 transition-colors">
                  <span className="font-bold">Dev</span>
                  <span>2h</span>
                </div>
              </div>
            </div>
          </section>

          {/* Timezone Intelligence */}
          <section className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-medium mb-6">
                <Globe2 className="w-4 h-4" /> Global Normalization
              </div>
              <h2 className="text-3xl font-bold mb-4">Timezone Intelligence.</h2>
              <p className="text-lg text-muted-foreground mb-6">
                When an engineer in Tokyo logs time, a manager in New York sees it correctly in their own local time. We handle the UTC conversions silently.
              </p>
              <ul className="space-y-3">
                {[
                  "Automatic browser timezone detection",
                  "Manual timezone overrides per member",
                  "Normalized billing reports",
                  "Cross-border timesheet boundaries"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-warning shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full glass-card border-l-4 border-l-warning rounded-2xl p-6">
               <div className="flex items-center justify-between py-3 border-b border-border/50">
                 <div className="flex flex-col">
                   <span className="text-sm font-medium">Tokyo (JST)</span>
                   <span className="text-xs text-muted-foreground">Member Time</span>
                 </div>
                 <div className="font-mono text-sm">Oct 14, 09:00 AM</div>
               </div>
               <div className="flex justify-center py-2">
                 <div className="w-px h-6 bg-border" />
               </div>
               <div className="flex items-center justify-between py-3 pt-0">
                 <div className="flex flex-col">
                   <span className="text-sm font-medium text-warning">New York (EST)</span>
                   <span className="text-xs text-muted-foreground">Admin Report View</span>
                 </div>
                 <div className="font-mono text-sm text-warning">Oct 13, 08:00 PM</div>
               </div>
            </div>
          </section>

          {/* Automated Reminders */}
          <section className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
                <BellRing className="w-4 h-4" /> Reminders
              </div>
              <h2 className="text-3xl font-bold mb-4">Never chase a timesheet again.</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Set up intelligent nudges. Kloqra automatically pings members who haven't logged their minimum hours or submitted their weekly sheet.
              </p>
            </div>
            <div className="flex-1 w-full">
              <div className="glass-card p-6 rounded-2xl border border-border/50 bg-background flex items-start gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <BellRing className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Missing Timesheet Alert</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Hi Alex, your timesheet for Week 42 is due. You have 32/40 hours logged.
                  </p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-muted rounded text-[10px] font-bold uppercase">Sent via Email</span>
                    <span className="px-2 py-1 bg-[#E01E5A]/10 text-[#E01E5A] rounded text-[10px] font-bold uppercase">Sent via Slack</span>
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
