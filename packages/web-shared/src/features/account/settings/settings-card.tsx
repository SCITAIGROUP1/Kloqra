"use client";

import { cn } from "@kloqra/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  action,
  className
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
