import { Skeleton } from "@kloqra/ui";
import dynamic from "next/dynamic";

function ExportsLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

const ExportsPage = dynamic(
  () => import("@/features/exports/exports-page").then((m) => ({ default: m.ExportsPage })),
  {
    loading: () => <ExportsLoading />
  }
);

export default function Page() {
  return <ExportsPage />;
}
