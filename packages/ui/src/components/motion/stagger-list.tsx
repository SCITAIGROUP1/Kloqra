"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Children, forwardRef, isValidElement } from "react";
import { cn } from "../../lib/utils.js";
import { STAGGER_MAX_MS, STAGGER_STEP_MS } from "./motion-config.js";

export type StaggerListProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "section";
};

export type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  index?: number;
} & Omit<ComponentPropsWithoutRef<"div">, "className">;

/** Staggered fade-in. Do not use as a direct child of react-grid-layout — transform conflicts with grid positioning. */
export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(function StaggerItem(
  { children, className, index = 0, style, ...props },
  ref
) {
  const delay = Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS);

  return (
    <div
      ref={ref}
      className={cn("animate-fade-in motion-reduce:animate-none", className)}
      style={{ ...style, animationDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </div>
  );
});

export function StaggerList({ children, className, as: Tag = "div" }: StaggerListProps) {
  const items = Children.toArray(children);

  return (
    <Tag className={className}>
      {items.map((child, index) => {
        if (!isValidElement(child)) {
          return child;
        }
        return (
          <StaggerItem key={child.key ?? index} index={index}>
            {child}
          </StaggerItem>
        );
      })}
    </Tag>
  );
}
