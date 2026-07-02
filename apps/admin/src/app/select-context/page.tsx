"use client";

import { AdminContextSelectForm } from "@kloqra/web-shared";
import { Suspense } from "react";

function SelectContextContent() {
  return <AdminContextSelectForm portalLabel="Admin Portal" defaultRedirect="/dashboard" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <SelectContextContent />
    </Suspense>
  );
}
