"use client";

import { ROUTES } from "@kloqra/contracts";
import type { UserProfileDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@kloqra/ui";
import { api } from "@kloqra/web-shared";
import { Pencil, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const dailyTargetStorageKey = (userId: string) => `kloqra:daily-target-hours:${userId}`;

interface DailyGoalWidgetProps {
  totalSeconds: number;
  cardless?: boolean;
}

export function DailyGoalWidget({ totalSeconds, cardless = false }: DailyGoalWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const userId = useSessionStore((s) => s.session?.user.id);
  const isImpersonating = Boolean(useSessionStore((s) => s.session?.impersonatorId));
  const [targetHours, setTargetHours] = useState(8);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("8");

  const loadProfile = useCallback(async () => {
    if (!ws || !userId) return;
    try {
      let profile = await api<UserProfileDto>(ROUTES.USERS.ME, { workspaceId: ws });

      const legacyKey = dailyTargetStorageKey(userId);
      const legacyRaw = localStorage.getItem(legacyKey);
      const legacyHours = legacyRaw ? parseFloat(legacyRaw) : NaN;
      const hasServerPref = typeof profile.preferences.dailyTargetHours === "number";

      if (!hasServerPref && !Number.isNaN(legacyHours) && legacyHours >= 0.5 && legacyHours <= 24) {
        profile = await api<UserProfileDto>(ROUTES.USERS.PREFERENCES, {
          method: "PATCH",
          workspaceId: ws,
          body: JSON.stringify({ dailyTargetHours: legacyHours })
        });
        localStorage.removeItem(legacyKey);
      }

      setTargetHours(profile.effectiveDailyTargetHours);
      setEditValue(String(profile.effectiveDailyTargetHours));
    } catch {
      /* keep defaults */
    }
  }, [ws, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const targetSeconds = targetHours * 3600;
  const percentage = Math.min(100, Math.round((totalSeconds / targetSeconds) * 100));
  const isGoalReached = totalSeconds >= targetSeconds;

  const hoursLogged = (totalSeconds / 3600).toFixed(1);

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  const saveGoal = useCallback(async () => {
    const parsed = parseFloat(editValue);
    if (Number.isNaN(parsed) || parsed < 0.5 || parsed > 24) {
      toast.error("Enter a value between 0.5 and 24 hours");
      return;
    }
    if (!ws) return;
    try {
      const updated = await api<UserProfileDto>(ROUTES.USERS.PREFERENCES, {
        method: "PATCH",
        workspaceId: ws,
        body: JSON.stringify({ dailyTargetHours: parsed })
      });
      setTargetHours(updated.effectiveDailyTargetHours);
      setEditing(false);
      toast.success(`Daily goal updated to ${parsed} hrs`);
    } catch {
      toast.error("Could not save daily goal");
    }
  }, [ws, editValue]);

  const bodyContent = (
    <div className="flex flex-row items-center gap-6 py-2 w-full h-full min-w-0">
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

      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold tracking-tight">
            {hoursLogged}{" "}
            <span className="text-sm font-medium text-muted-foreground">/ {targetHours} hrs</span>
          </p>
          {isGoalReached && !cardless && (
            <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium shrink-0 animate-pulse border border-green-500/20">
              Target Reached!
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-snug truncate-multiline">
          {isGoalReached
            ? "Goal reached! Keep up the good work!"
            : `Need ${((targetSeconds - totalSeconds) / 3600).toFixed(1)} more hours today.`}
        </p>
        <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${isGoalReached ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (cardless) {
    return bodyContent;
  }

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground flex items-center justify-between">
          <span>Daily Progress</span>
          <span className="flex items-center gap-1">
            {isGoalReached && (
              <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800/30 animate-pulse font-medium">
                Target Reached!
              </span>
            )}
            {!isImpersonating && (
              <>
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
              </>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6 py-2">{bodyContent}</CardContent>
    </Card>
  );
}
