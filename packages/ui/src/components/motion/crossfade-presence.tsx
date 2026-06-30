"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { MOTION_ENTER_S } from "./motion-config.js";

export type CrossfadePresenceProps = {
  /** Unique key for the active child — changes trigger crossfade. */
  presenceKey: string | number | boolean;
  children: ReactNode;
  className?: string;
  /** Duration in seconds for enter. */
  duration?: number;
  /** Skip enter animation on first mount (default true). */
  skipInitial?: boolean;
};

function StaticCrossfadePresence({ presenceKey, children, className }: CrossfadePresenceProps) {
  return (
    <div
      key={String(presenceKey)}
      className={cn("animate-fade-in motion-reduce:animate-none", className)}
    >
      {children}
    </div>
  );
}

export function CrossfadePresence({
  presenceKey,
  children,
  className,
  duration = MOTION_ENTER_S,
  skipInitial = true
}: CrossfadePresenceProps) {
  const [Animated, setAnimated] = useState<ComponentType<CrossfadePresenceProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./crossfade-presence-animated.js").then((mod) => {
      if (!cancelled) {
        setAnimated(() => mod.AnimatedCrossfadePresence);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Animated) {
    return (
      <StaticCrossfadePresence presenceKey={presenceKey} className={className}>
        {children}
      </StaticCrossfadePresence>
    );
  }

  return (
    <Animated
      presenceKey={presenceKey}
      className={className}
      duration={duration}
      skipInitial={skipInitial}
    >
      {children}
    </Animated>
  );
}
