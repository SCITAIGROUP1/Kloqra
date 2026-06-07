"use client";

import { ROUTES } from "@chronomint/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@chronomint/ui";
import { Pencil, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

interface DailyGoalWidgetProps {
  totalSeconds: number;
}

export function DailyGoalWidget({ totalSeconds }: DailyGoalWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const [targetHours, setTargetHours] = useState(8);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("8");

  // Load dailyTargetHours from workspace settings
  useEffect(() => {
    if (!ws) return;
    api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws })
      .then((list) => {
        const current = list.find((w) => w.id === ws);
        const hours = current?.settings?.dailyTargetHours;
        if (typeof hours === "number" && hours > 0) {
          setTargetHours(hours);
          setEditValue(String(hours));
        }
      })
      .catch(() => {});
  }, [ws]);

  const targetSeconds = targetHours * 3600;
  const percentage = Math.min(100, Math.round((totalSeconds / targetSeconds) * 100));
  const isGoalReached = totalSeconds >= targetSeconds;

  const hoursLogged = (totalSeconds / 3600).toFixed(1);

  // SVG parameters
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  const saveGoal = useCallback(async () => {
    const parsed = parseFloat(editValue);
    if (isNaN(parsed) || parsed < 0.5 || parsed > 24) {
      toast.error("Enter a value between 0.5 and 24 hours");
      return;
    }
    try {
      // Load current settings first
      const list = await api<any[]>(ROUTES.WORKSPACES.LIST, { workspaceId: ws });
      const current = list.find((w) => w.id === ws);
      const currentSettings = current?.settings ?? {};

      await api(ROUTES.WORKSPACES.BY_ID(ws), {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({
          settings: { ...currentSettings, dailyTargetHours: parsed }
        })
      });
      setTargetHours(parsed);
      setEditing(false);
      toast.success(`Daily goal updated to ${parsed} hrs`);
    } catch {
      toast.error("Could not save daily goal");
    }
  }, [ws, editValue]);

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground flex items-center justify-between">
          <span>Daily Progress</span>
          <span className="flex items-center gap-1">
            {isGoalReached && (
              <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800/30 animate-pulse font-medium">
                🎉 Target Reached!
              </span>
            )}
            {editing ? (
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveGoal();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  autoFocus
                />
                <span className="text-[10px] text-muted-foreground">hrs</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-primary/10 text-primary"
                  onClick={() => void saveGoal()}
                  title="Save"
                >
                  <Check className="size-3" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted text-muted-foreground"
                  onClick={() => setEditing(false)}
                  title="Cancel"
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="rounded p-0.5 hover:bg-muted text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => {
                  setEditValue(String(targetHours));
                  setEditing(true);
                }}
                title="Edit daily goal"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6 py-2">
        {/* SVG Circular Ring */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-muted/40"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className={`transition-all duration-500 ease-out ${isGoalReached ? "stroke-green-500" : "stroke-primary"}`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tracking-tight">{percentage}%</span>
            <span className="text-[10px] text-muted-foreground">of target</span>
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight">
            {hoursLogged}{" "}
            <span className="text-sm font-medium text-muted-foreground">/ {targetHours} hrs</span>
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isGoalReached
              ? "Great job! You've reached your daily target. Keep up the good work!"
              : `Keep going! You need ${((targetSeconds - totalSeconds) / 3600).toFixed(1)} more hours to hit your goal today.`}
          </p>
          <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isGoalReached ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
