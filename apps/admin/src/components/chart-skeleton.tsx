import { Skeleton } from "@kloqra/ui";

export function ChartSkeleton({
  className = "min-h-[280px]",
  style
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <Skeleton style={style} className={`w-full rounded-md ${className}`} />;
}
