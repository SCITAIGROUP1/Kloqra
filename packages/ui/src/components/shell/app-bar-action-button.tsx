"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.js";
import { Button } from "../ui/button.js";
import { appBarActionButtonVariants } from "./shell-styles.js";

export type AppBarActionButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  active?: boolean;
};

export function AppBarActionButton({
  active = false,
  className,
  size = "sm",
  variant = "outline",
  ...props
}: AppBarActionButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      className={cn(appBarActionButtonVariants({ active }), className)}
      {...props}
    />
  );
}
