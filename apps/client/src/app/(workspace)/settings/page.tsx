import { AccountSettingsPage } from "@kloqra/web-shared";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <AccountSettingsPage notificationsVariant="member" />
    </Suspense>
  );
}
