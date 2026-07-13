import { cn } from "./utils.js";

/** Muted background + text for inactive entity list rows. */
export const inactiveEntityRowClassName = "bg-muted/40 text-muted-foreground hover:bg-muted/55";

/**
 * Returns row class names for active/inactive entities.
 * Active rows pass through optional `className` only.
 */
export function entityRowClassName(isActive: boolean, className?: string): string {
  return cn(!isActive && inactiveEntityRowClassName, className);
}
