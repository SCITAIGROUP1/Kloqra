import { PlatformSetup2faForm } from "@kloqra/web-shared";

export default async function Setup2faPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <PlatformSetup2faForm pendingToken={token} />;
}
