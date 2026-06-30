import { AuthShell } from "@kloqra/web-shared";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <AuthShell title="Sign in">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
