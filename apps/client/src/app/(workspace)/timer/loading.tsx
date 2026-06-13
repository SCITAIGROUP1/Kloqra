import { Skeleton } from "@kloqra/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <Skeleton className="h-24 w-48 rounded-lg" />
    </div>
  );
}
