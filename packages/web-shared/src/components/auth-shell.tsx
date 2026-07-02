"use client";

import { BRAND_NAME } from "@kloqra/contracts";
import type { ReactNode } from "react";
import { AuthHeroPanel } from "./auth-hero-panel";
import { BrandMark } from "./brand-mark";
import { LegalFooterLinks } from "./legal-footer";
import { PlatformAuthHeroPanel } from "./platform-auth-hero-panel";

export type AuthShellProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  description?: string;
  portalLabel?: string;
  variant?: "default" | "platform";
  hero?: ReactNode;
};

export function AuthShell({
  title,
  children,
  footer,
  description,
  portalLabel,
  variant = "default",
  hero
}: AuthShellProps) {
  const year = new Date().getFullYear();

  return (
    <main className="flex min-h-[100dvh] items-start justify-center bg-muted/40 p-3 sm:items-center sm:p-5 md:p-8 lg:min-h-screen lg:p-12">
      <div className="grid w-full max-w-full overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/15 drop-shadow-2xl sm:max-w-lg sm:rounded-2xl md:max-w-2xl lg:max-w-4xl lg:min-h-[min(640px,calc(100vh-6rem))] lg:grid-cols-2 xl:max-w-5xl">
        <div className="flex flex-col bg-background lg:min-h-0">
          <header className="px-4 pt-4 sm:px-5 sm:pt-5 md:px-8 md:pt-7 lg:px-10">
            <BrandMark size="lg" showWordmark subtitle={portalLabel} />
          </header>

          <div className="flex flex-1 flex-col justify-start px-4 py-5 sm:justify-center sm:px-5 sm:py-6 md:px-8 lg:px-10">
            <div className="w-full lg:max-w-md">
              <div className="mb-5 space-y-2 sm:mb-6">
                <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h1>
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {children}
              {footer ? <div className="mt-4">{footer}</div> : null}
            </div>
          </div>

          <footer className="px-4 pb-4 text-xs text-muted-foreground sm:px-5 sm:pb-5 md:px-8 md:pb-7 lg:px-10">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <LegalFooterLinks />
              <span className="mx-1 hidden sm:inline">·</span>
              <span>
                Copyright © {year} {BRAND_NAME}
              </span>
            </div>
          </footer>
        </div>

        {hero ?? (variant === "platform" ? <PlatformAuthHeroPanel /> : <AuthHeroPanel />)}
      </div>
    </main>
  );
}
