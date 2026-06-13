import { cn } from "../../lib/utils.js";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md animate-shimmer", className)} aria-hidden {...props} />;
}

export function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && lines > 1 ? "w-4/5" : "w-full")}
        />
      ))}
    </div>
  );
}
