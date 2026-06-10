"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils.js";
import { appBarIconButtonVariants } from "./shell-styles.js";

export function appBarIconButtonClass(className?: string, options?: { active?: boolean }) {
  return cn(appBarIconButtonVariants({ active: options?.active }), className);
}

export type AppBarIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function AppBarIconButton({
  className,
  active = false,
  children,
  ...props
}: AppBarIconButtonProps) {
  return (
    <button type="button" className={appBarIconButtonClass(className, { active })} {...props}>
      {children}
    </button>
  );
}
