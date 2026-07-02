import { Badge } from "@kloqra/ui";

type EntityStatusBadgeProps = {
  isActive: boolean;
};

export function EntityStatusBadge({ isActive }: EntityStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
