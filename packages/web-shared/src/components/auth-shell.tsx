"use client";

import { BRAND_SUBTAGLINE, BRAND_TAGLINE } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@kloqra/ui";
import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";

export type AuthShellProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="mb-8 flex max-w-md flex-col items-center text-center">
        <BrandMark size="lg" showWordmark className="mb-4 justify-center" />
        <p className="text-lg font-medium tracking-tight text-foreground">{BRAND_TAGLINE}</p>
        <p className="mt-1 text-sm text-muted-foreground">{BRAND_SUBTAGLINE}</p>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {children}
          {footer ? <div className="mt-4">{footer}</div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
