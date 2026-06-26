"use client";

import { CheckCircle2 } from "lucide-react";
import { FAQAccordion } from "../../components/home/faq-accordion";

export default function PricingPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Simple pricing. Serious features.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your team.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-card p-8 rounded-3xl border-t-4 border-t-primary flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <div className="text-4xl font-extrabold mb-6">
              $29<span className="text-lg text-muted-foreground font-normal">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Up to 10 seats
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Up to 3 workspaces
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Time tracking and
                timesheets
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Approval workflows
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Exports and reporting
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-primary w-5 h-5 shrink-0" /> Mobile-friendly access
              </li>
            </ul>
            <button className="w-full py-3 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
              Start Free Trial
            </button>
          </div>

          <div className="glass-card p-8 rounded-3xl border-4 border-premium flex flex-col relative transform md:-translate-y-4 shadow-xl shadow-premium/10">
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-4 px-3 py-1 bg-premium text-white text-xs font-bold rounded-full">
              MOST POPULAR
            </div>
            <h3 className="text-2xl font-bold mb-2 text-premium">Pro</h3>
            <div className="text-4xl font-extrabold mb-6">
              $99<span className="text-lg text-muted-foreground font-normal">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Up to 50 seats
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Up to 10 workspaces
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Priority email support
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> AI features
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Time tracking and
                timesheets
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Approval workflows
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Exports and reporting
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-premium w-5 h-5 shrink-0" /> Mobile-friendly access
              </li>
            </ul>
            <button className="w-full py-3 rounded-lg bg-premium text-white font-medium hover:bg-premium/90 transition-colors">
              Start Free Trial
            </button>
          </div>

          <div className="glass-card p-8 rounded-3xl border-t-4 border-t-muted-foreground flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
            <div className="text-4xl font-extrabold mb-6">Custom</div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Up to 100 seats
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Up to 25 workspaces
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Up to 50 reporting API
                keys
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Dedicated account
                manager
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Custom integrations
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Enterprise SLAs
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Time tracking and
                timesheets
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Approval workflows
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Exports and reporting
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="text-foreground w-5 h-5 shrink-0" /> Mobile-friendly access
              </li>
            </ul>
            <button className="w-full py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors">
              Talk to Sales
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQAccordion />
    </div>
  );
}
