"use client";

import { WorkspaceSelectForm } from "@kloqra/web-shared";
import { Suspense } from "react";

function SelectWorkspaceContent() {
  return (
    <WorkspaceSelectForm
      portalLabel="Admin Portal"
      defaultRedirect="/dashboard"
      roleFilter="ADMIN"
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <SelectWorkspaceContent />
    </Suspense>
  );
}
