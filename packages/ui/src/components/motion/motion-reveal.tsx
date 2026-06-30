"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";

export type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (applied via inline style). */
  delay?: number;
  as?: "div" | "section" | "article";
};

export function MotionReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div"
}: MotionRevealProps) {
  return (
    <Tag
      className={cn("animate-fade-in motion-reduce:animate-none", className)}
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
