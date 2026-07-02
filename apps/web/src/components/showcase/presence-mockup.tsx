"use client";

import { useState, useEffect } from "react";

export function PresenceMockup() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (baseSeconds: number) => {
    const total = baseSeconds + seconds;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const members = [
    { name: "Chamal D.", project: "API Redesign", base: 8040, active: true },
    { name: "Sarah K.", project: "Mobile App", base: 3720, active: true },
    { name: "Alex M.", project: "Design Review", base: 2700, active: true },
    { name: "Jamie L.", project: "(Not tracking)", base: 0, active: false }
  ];

  return (
    <div className="flex-1 glass-card p-6 rounded-2xl border-l-4 border-l-success">
      <h4 className="font-bold text-lg mb-6 flex items-center justify-between border-b border-border pb-4">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Team Live
        </span>
        <span className="text-sm font-normal text-muted-foreground">3 of 8</span>
      </h4>
      <div className="space-y-1">
        {members.map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm py-3 px-2 rounded-lg hover:bg-background/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${m.active ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-muted"}`}
              />
              <div className="flex flex-col">
                <span className={`font-medium ${!m.active && "text-muted-foreground"}`}>
                  {m.name}
                </span>
                <span className="text-xs text-muted-foreground">{m.project}</span>
              </div>
            </div>
            {m.active && (
              <span className="font-mono text-muted-foreground text-xs w-16 text-right tabular-nums">
                {formatElapsed(m.base)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
