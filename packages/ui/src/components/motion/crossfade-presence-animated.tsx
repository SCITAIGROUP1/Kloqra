"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { cn } from "../../lib/utils.js";
import { MOTION_EASE, MOTION_ENTER_S, MOTION_EXIT_S } from "./motion-config.js";

export type AnimatedCrossfadePresenceProps = {
  presenceKey: string | number | boolean;
  children: ReactNode;
  className?: string;
  duration?: number;
  skipInitial?: boolean;
};

export function AnimatedCrossfadePresence({
  presenceKey,
  children,
  className,
  duration = MOTION_ENTER_S,
  skipInitial = true
}: AnimatedCrossfadePresenceProps) {
  const reducedMotion = useReducedMotion();
  const hasMountedRef = useRef(false);

  const skipEnter =
    reducedMotion || (skipInitial && !hasMountedRef.current && presenceKey !== undefined);

  if (!hasMountedRef.current) {
    hasMountedRef.current = true;
  }

  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.div
        key={String(presenceKey)}
        initial={skipEnter ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={
          reducedMotion
            ? undefined
            : { opacity: 0, transition: { duration: MOTION_EXIT_S, ease: MOTION_EASE } }
        }
        transition={{ duration: reducedMotion ? 0 : duration, ease: MOTION_EASE }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
