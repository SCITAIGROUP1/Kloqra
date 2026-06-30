"use client";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kloqra/ui";
import type { ReactNode } from "react";

type WorkspaceSectionCardProps = {
  title: string;
  description?: string;
  status?: { label: string; connected: boolean };
  children: ReactNode;
};

export function WorkspaceSectionCard({
  title,
  description,
  status,
  children
}: WorkspaceSectionCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {status ? (
            <Badge
              variant={status.connected ? "default" : "secondary"}
              className={
                status.connected ? "shrink-0 bg-emerald-600 hover:bg-emerald-600/90" : "shrink-0"
              }
            >
              {status.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
