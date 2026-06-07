export function ChartSkeleton({
  className = "min-h-[280px]",
  style
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div style={style} className={`w-full animate-pulse rounded-md bg-muted ${className}`} />;
}
