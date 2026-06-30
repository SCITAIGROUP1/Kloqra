import { Skeleton } from "@kloqra/ui";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
