"use client";

import { SupportTicketForm , getApiBase } from "@kloqra/web-shared";

export default function SupportPage() {
  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            How can we help?
          </h1>
          <p className="text-xl text-muted-foreground">
            Tell us what you need — we'll route your request to the right team automatically.
          </p>
        </div>

        <div className="glass-card p-8 rounded-3xl">
          <SupportTicketForm apiBase={getApiBase()} />
        </div>
      </div>
    </div>
  );
}
