"use client";

import { ROUTES, type PublicWidgetShareViewDto } from "@kloqra/contracts";
import { Card, CardDescription, CardHeader, CardTitle } from "@kloqra/ui";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicWidgetView } from "@/features/dashboard/public-widget-view";
import { publicFetch } from "@/lib/api";

export default function PublicWidgetSharePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const [data, setData] = useState<PublicWidgetShareViewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Invalid share link.");
      setLoading(false);
      return;
    }
    publicFetch<PublicWidgetShareViewDto>(ROUTES.REPORTING.WIDGET_SHARE(token))
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "This share link is invalid or has expired.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <p className="text-muted-foreground">Loading shared widget…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Widget unavailable</CardTitle>
            <CardDescription>{error ?? "Unknown error"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">Shared widget · read-only</p>
          <h1 className="text-2xl font-semibold">{data.workspaceName}</h1>
          <p className="text-lg font-medium">{data.widgetLabel}</p>
          <p className="text-sm text-muted-foreground">
            {data.period.from} – {data.period.to}
          </p>
        </div>

        <PublicWidgetView data={data} />
      </div>
    </div>
  );
}
