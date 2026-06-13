"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils.js";
import type { DismissableListProps } from "./dismissable-list.js";
import { MOTION_EASE, MOTION_EXIT_S } from "./motion-config.js";

export function AnimatedDismissableList<T extends { id: string }>({
  items,
  className,
  itemClassName,
  renderItem
}: DismissableListProps<T>) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={false}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{
              duration: reducedMotion ? 0.01 : MOTION_EXIT_S,
              ease: MOTION_EASE
            }}
            className={cn(itemClassName)}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
