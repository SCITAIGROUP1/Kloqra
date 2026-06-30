"use client";

import { BRAND_SUBTAGLINE, BRAND_TAGLINE } from "@kloqra/contracts";
import { AuthProductPreview } from "./auth-product-preview";

export function AuthHeroPanel() {
  return (
    <aside
      aria-hidden
      className="relative flex min-h-0 flex-col overflow-hidden border-t border-primary-foreground/10 bg-primary text-primary-foreground lg:h-full lg:border-t-0"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-10 top-8 hidden h-40 w-40 rounded-full bg-primary-foreground/10 sm:block lg:-right-16 lg:top-12 lg:h-64 lg:w-64" />
        <div className="absolute bottom-16 left-4 hidden h-28 w-28 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 sm:block lg:bottom-24 lg:left-8 lg:h-40 lg:w-40" />
        <div className="absolute right-1/4 top-1/3 hidden h-16 w-16 rounded-full border border-primary-foreground/10 md:block lg:h-24 lg:w-24" />
      </div>

      <div className="relative z-10 flex w-full flex-col justify-center gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:h-full lg:gap-6 lg:px-6 lg:py-8 xl:gap-8 xl:px-8 xl:py-10">
        <div className="space-y-2 sm:space-y-3">
          <h2 className="max-w-xl text-xl font-medium tracking-tight sm:text-2xl lg:text-2xl xl:text-3xl">
            {BRAND_TAGLINE}
          </h2>
          <p className="max-w-xl text-sm text-primary-foreground/80 sm:text-base">
            {BRAND_SUBTAGLINE}
          </p>
        </div>

        <AuthProductPreview className="hidden sm:block" />
      </div>
    </aside>
  );
}
