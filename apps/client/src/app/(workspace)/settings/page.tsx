import { Skeleton } from "@kloqra/ui";
import { AccountSettingsPage } from "@kloqra/web-shared";
import { Suspense } from "react";

function SettingsFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <AccountSettingsPage notificationsVariant="member" />
    </Suspense>
  );
}
