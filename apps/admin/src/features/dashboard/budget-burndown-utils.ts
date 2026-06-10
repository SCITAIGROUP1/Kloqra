export function budgetBarColor(percentUsed: number): string {
  if (percentUsed >= 100) return "bg-destructive";
  if (percentUsed >= 50) return "bg-warning";
  return "bg-success";
}
