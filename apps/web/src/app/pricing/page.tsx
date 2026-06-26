"use client";

import { usePricingPlans } from "@kloqra/web-shared";
import { CheckCircle2, Loader2 } from "lucide-react";
import { FAQAccordion } from "../../components/home/faq-accordion";

export default function PricingPage() {
  const { plans, loading, error } = usePricingPlans();

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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">{error}</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`glass-card p-8 rounded-3xl flex flex-col relative ${
                  plan.recommended
                    ? "border-4 border-premium transform md:-translate-y-4 shadow-xl shadow-premium/10"
                    : plan.billingMode === "contact"
                      ? "border-t-4 border-t-muted-foreground"
                      : "border-t-4 border-t-primary"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-4 px-3 py-1 bg-premium text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className={`text-2xl font-bold mb-2 ${plan.recommended ? "text-premium" : ""}`}>
                  {plan.name}
                </h3>
                <div className="text-4xl font-extrabold mb-6">
                  {plan.billingMode === "contact"
                    ? "Custom"
                    : `$${(plan.monthlyPriceCents ?? 0) / 100}`}
                  {plan.billingMode !== "contact" && (
                    <span className="text-lg text-muted-foreground font-normal">/mo</span>
                  )}
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.displayFeatures.map((feature, index) => (
                    <li key={index} className="flex gap-3">
                      <CheckCircle2
                        className={`${
                          plan.recommended
                            ? "text-premium"
                            : plan.billingMode === "contact"
                              ? "text-foreground"
                              : "text-primary"
                        } w-5 h-5 shrink-0`}
                      />{" "}
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.billingMode === "contact"
                      ? "border border-border hover:bg-muted"
                      : plan.recommended
                        ? "bg-premium text-white hover:bg-premium/90"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {plan.billingMode === "contact" ? "Talk to Sales" : "Start Free Trial"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <FAQAccordion />
    </div>
  );
}
