"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "../../lib/utils.js";

export type DismissableListProps<T extends { id: string }> = {
  items: T[];
  className?: string;
  itemClassName?: string;
  renderItem: (item: T) => ReactNode;
};

function StaticDismissableList<T extends { id: string }>({
  items,
  className,
  itemClassName,
  renderItem
}: DismissableListProps<T>) {
  return (
    <div className={className}>
      {items.map((item) => (
        <div key={item.id} className={cn(itemClassName)}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

export function DismissableList<T extends { id: string }>(props: DismissableListProps<T>) {
  const [Animated, setAnimated] = useState<ComponentType<DismissableListProps<T>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./dismissable-list-animated.js").then((mod) => {
      if (!cancelled) {
        setAnimated(() => mod.AnimatedDismissableList);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Animated) {
    return <StaticDismissableList {...props} />;
  }

  return <Animated {...props} />;
}
