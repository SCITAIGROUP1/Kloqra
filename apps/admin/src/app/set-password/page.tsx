import { AuthShell } from "@kloqra/web-shared";
import { Suspense } from "react";
import { AdminSetPasswordForm } from "./set-password-form";

function SetPasswordFallback() {
  return (
    <AuthShell title="Set your password">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </AuthShell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<SetPasswordFallback />}>
      <AdminSetPasswordForm />
    </Suspense>
  );
}
