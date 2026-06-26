"use client";

import { useState, useEffect } from "react";

export function TimerMockup() {
  const [seconds, setSeconds] = useState(8073); // 02:14:33

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex-1 glass-card p-8 rounded-2xl border-l-4 border-l-primary relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 text-xs font-mono text-muted-foreground opacity-50">
        [Space] to stop
      </div>
      <div className="mb-2 text-sm text-muted-foreground font-medium">
        API Redesign <span className="mx-1">›</span> Auth module
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
        <span className="font-mono text-4xl font-light tracking-tight">{formatTime(seconds)}</span>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>Today: 6h 32m</span>
        <span>Goal: 8h</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div className="w-[80%] h-full bg-primary" />
      </div>

      <div className="mt-6 flex gap-3">
        <button className="flex-1 py-2 rounded-lg bg-background border border-border text-sm font-medium hover:bg-muted transition-colors">
          Pause
        </button>
        <button className="flex-1 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors">
          Stop & Save
        </button>
      </div>
    </div>
  );
}
