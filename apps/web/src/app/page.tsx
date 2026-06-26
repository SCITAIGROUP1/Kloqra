"use client";

import { Button } from "@kloqra/ui";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { FAQAccordion } from "../components/home/faq-accordion";
import { ROICalculator } from "../components/home/roi-calculator";
import { SocialMarquee } from "../components/home/social-marquee";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-20">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[140px] animate-orbit mix-blend-screen" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-premium/20 rounded-full blur-[140px] animate-orbit mix-blend-screen"
          style={{ animationDelay: "-7s" }}
        />

        {/* Grid pattern texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            Built for agencies & product teams
          </div>

          <h1
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            Time tracking that <br className="hidden md:block" />
            <span className="text-gradient">actually saves time.</span>
          </h1>

          <p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            Kloqra captures time automatically, enforces accountability, and turns hours into
            billing-ready insight.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              size="lg"
              asChild
              className="w-full sm:w-auto text-base h-12 px-8 bg-white text-black hover:bg-white/90"
            >
              <Link href="http://localhost:3000/register">Start Tracking — Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full sm:w-auto text-base h-12 px-8 glass-card"
            >
              <Link href="#demo">
                <Play className="mr-2 h-4 w-4" /> See It in Action
              </Link>
            </Button>
          </div>

          <div
            className="flex items-center justify-center gap-4 text-sm text-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "400ms" }}
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span>Trusted by 800+ teams worldwide · ★★★★★ 4.9/5</span>
          </div>
        </div>
      </section>

      {/* Built for Every Role Strip */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Every Role</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every role has exactly the right access. Nothing more. Nothing less.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {/* Owner */}
            <Link
              href="/roles/tenant-owner"
              className="glass-card p-6 rounded-2xl flex flex-col gap-4 group transition-all hover:-translate-y-2 hover:shadow-premium/20 border-t-[3px] border-t-premium"
            >
              <div className="h-10 w-10 rounded-lg bg-premium/20 text-premium flex items-center justify-center text-xl">
                👑
              </div>
              <h3 className="font-bold text-lg">Tenant Owner</h3>
              <p className="text-sm text-muted-foreground flex-1">
                Cross-workspace analytics, billing & plans
              </p>
              <span className="text-sm text-premium font-medium flex items-center group-hover:underline">
                Explore <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* Org Admin */}
            <Link
              href="/roles/tenant-admin"
              className="glass-card p-6 rounded-2xl flex flex-col gap-4 group transition-all hover:-translate-y-2 hover:shadow-primary/20 border-t-[3px] border-t-primary"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xl">
                🏢
              </div>
              <h3 className="font-bold text-lg">Org Admin</h3>
              <p className="text-sm text-muted-foreground flex-1">Delegates & workspace setup</p>
              <span className="text-sm text-primary font-medium flex items-center group-hover:underline">
                Explore <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* WS Admin */}
            <Link
              href="/roles/workspace-admin"
              className="glass-card p-6 rounded-2xl flex flex-col gap-4 group transition-all hover:-translate-y-2 hover:shadow-success/20 border-t-[3px] border-t-success"
            >
              <div className="h-10 w-10 rounded-lg bg-success/20 text-success flex items-center justify-center text-xl">
                🛠
              </div>
              <h3 className="font-bold text-lg">WS Admin</h3>
              <p className="text-sm text-muted-foreground flex-1">
                Projects, teams, exports, rates
              </p>
              <span className="text-sm text-success font-medium flex items-center group-hover:underline">
                Explore <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* PM */}
            <Link
              href="/roles/project-manager"
              className="glass-card p-6 rounded-2xl flex flex-col gap-4 group transition-all hover:-translate-y-2 hover:shadow-warning/20 border-t-[3px] border-t-warning"
            >
              <div className="h-10 w-10 rounded-lg bg-warning/20 text-warning flex items-center justify-center text-xl">
                ⚡
              </div>
              <h3 className="font-bold text-lg">Project Lead</h3>
              <p className="text-sm text-muted-foreground flex-1">Scoped task & team management</p>
              <span className="text-sm text-warning font-medium flex items-center group-hover:underline">
                Explore <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* Member */}
            <Link
              href="/roles/member"
              className="glass-card p-6 rounded-2xl flex flex-col gap-4 group transition-all hover:-translate-y-2 hover:shadow-white/20 border-t-[3px] border-t-muted-foreground"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                👤
              </div>
              <h3 className="font-bold text-lg">Member</h3>
              <p className="text-sm text-muted-foreground flex-1">Timer, timesheets, & privacy</p>
              <span className="text-sm text-foreground font-medium flex items-center group-hover:underline">
                Explore <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* New Phase 2 Components */}
      <SocialMarquee />
      <ROICalculator />
      <FAQAccordion />

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to stop chasing timesheets?</h2>
          <p className="text-xl text-muted-foreground mb-10">
            14-day free trial · No credit card · Cancel anytime
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild className="h-14 px-8 text-lg bg-white text-black">
              <Link href="http://localhost:3000/register">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
