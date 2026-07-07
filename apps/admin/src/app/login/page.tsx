import { AuthShell } from "@kloqra/web-shared";
import { Suspense } from "react";
import { AdminLoginForm } from "@/app/login/login-form";

function LoginFallback() {
  return (
    <AuthShell title="Admin sign in" portalLabel="Admin Portal">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
