"use client";

import { cn } from "../../lib/utils.js";
import { shellMenuItemVariants, shellMenuPanelClass } from "./shell-styles.js";

export function ShellMenuPanel({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn(shellMenuPanelClass, className)} role="menu" {...props}>
      {children}
    </div>
  );
}

export function ShellMenuItem({
  active = false,
  tone = "default",
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(shellMenuItemVariants({ active, tone }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ShellMenuRadioItem({
  active = false,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className={cn(shellMenuItemVariants({ active }), className)}
      {...props}
    >
      {children}
    </button>
  );
}
