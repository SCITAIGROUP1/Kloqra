"use client";

import type { TimeLogDto } from "@kloqra/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@kloqra/ui";
import { useUserProfile, toDateKeyInZone } from "@kloqra/web-shared";
import { Pencil, Check, X, Flame, Sun, Rocket, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { calculateDailyStreak, checkMilestones, getDailyTotals } from "./gamification-utils";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

const dailyTargetStorageKey = (userId: string) => `kloqra:daily-target-hours:${userId}`;

export type DailyGoalWidgetProps = {
  totalSeconds: number;
  cardless?: boolean;
  logs?: TimeLogDto[];
  timezone?: string;
};

export function DailyGoalWidget({
  totalSeconds,
  cardless = false,
  logs = [],
  timezone
}: DailyGoalWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const userId = useSessionStore((s) => s.session?.user.id);
  const isImpersonating = Boolean(useSessionStore((s) => s.session?.impersonatorId));
  const { profile, updatePreferences } = useUserProfile();
  const [targetHours, setTargetHours] = useState(8);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("8");
  const legacyMigratedRef = useRef(false);

  const resolvedTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    if (!profile) return;

    setTargetHours(profile.effectiveDailyTargetHours);
    setEditValue(String(profile.effectiveDailyTargetHours));

    if (!ws || !userId || legacyMigratedRef.current) return;

    const legacyKey = dailyTargetStorageKey(userId);
    const legacyRaw = localStorage.getItem(legacyKey);
    const legacyHours = legacyRaw ? parseFloat(legacyRaw) : NaN;
    const hasServerPref = typeof profile.preferences.dailyTargetHours === "number";

    if (!hasServerPref && !Number.isNaN(legacyHours) && legacyHours >= 0.5 && legacyHours <= 24) {
      legacyMigratedRef.current = true;
      void updatePreferences({ dailyTargetHours: legacyHours })
        .then((nextProfile) => {
          setTargetHours(nextProfile.effectiveDailyTargetHours);
          setEditValue(String(nextProfile.effectiveDailyTargetHours));
          localStorage.removeItem(legacyKey);
        })
        .catch(() => {
          legacyMigratedRef.current = false;
        });
    }
  }, [profile, ws, userId, updatePreferences]);

  const targetSeconds = targetHours * 3600;
  const percentage = Math.min(100, Math.round((totalSeconds / targetSeconds) * 100));
  const isGoalReached = totalSeconds >= targetSeconds;

  const hoursLogged = (totalSeconds / 3600).toFixed(2);

  const size = 110;
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
      const updated = await updatePreferences({ dailyTargetHours: parsed });
      setTargetHours(updated.effectiveDailyTargetHours);
      setEditing(false);
      toast.success(`Daily goal updated to ${parsed} hrs`);
    } catch {
      toast.error("Could not save daily goal");
    }
  }, [editValue, updatePreferences, ws]);

  // Gamification & Streaks calculations
  const streak = useMemo(() => {
    return calculateDailyStreak(logs, targetHours, resolvedTz);
  }, [logs, targetHours, resolvedTz]);

  const milestones = useMemo(() => {
    return checkMilestones(logs, targetHours, streak, resolvedTz);
  }, [logs, targetHours, streak, resolvedTz]);

  const dailyTotals = useMemo(() => {
    return getDailyTotals(logs, resolvedTz);
  }, [logs, resolvedTz]);

  const weeklyGrid = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    const days = [];
    const curr = new Date(monday);
    for (let i = 0; i < 7; i++) {
      const dateKey = toDateKeyInZone(curr, resolvedTz);
      const secondsLogged = dailyTotals[dateKey] || 0;
      const hoursLogged = secondsLogged / 3600;
      const dayName = curr.toLocaleDateString("en-US", { weekday: "narrow" });
      const formattedDate = curr.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;

      days.push({
        dateKey,
        dayName,
        formattedDate,
        hoursLogged,
        isWeekend,
        isToday: toDateKeyInZone(new Date(), resolvedTz) === dateKey
      });
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [dailyTotals, resolvedTz]);

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
            className={`transition-all duration-500 ease-out ${
              isGoalReached ? "stroke-green-500" : "stroke-primary"
            }`}
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

      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold tracking-tight">
            {hoursLogged}{" "}
            <span className="text-sm font-medium text-muted-foreground">/ {targetHours} hrs</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          {isGoalReached
            ? "Goal reached! Keep up the good work!"
            : `Need ${((targetSeconds - totalSeconds) / 3600).toFixed(2)} more hours today.`}
        </p>
        <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isGoalReached ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Streak Counter Badge */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 w-max px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold shadow-[0_0_8px_rgba(245,158,11,0.12)]">
            <Flame className="size-3.5 fill-amber-500 text-amber-500 animate-flame-flicker" />
            <span>{streak} Day Streak!</span>
          </div>
        )}
      </div>
    </div>
  );

  if (cardless) {
    return bodyContent;
  }

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground flex items-center justify-between">
          <span>Daily Progress</span>
          <span className="flex items-center gap-1">
            {isGoalReached && (
              <span className="text-[10px] bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800/30 animate-pulse font-medium shadow-[0_0_8px_rgba(34,197,94,0.15)]">
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
      <CardContent className="space-y-4">
        {/* Core Daily Target Row */}
        <div className="flex items-center gap-6 py-2">{bodyContent}</div>

        {/* 7-Day Weekly Grid */}
        <div className="space-y-2 mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Weekly Progress</span>
            <span className="text-[10px] font-normal text-muted-foreground">Mon – Sun</span>
          </p>
          <div className="flex justify-between items-center gap-1 bg-muted/20 p-2 rounded-lg border border-border/50">
            {weeklyGrid.map((day) => {
              let dotColor = "bg-muted/40 border-muted-foreground/20 text-muted-foreground";
              let status = "No logs";
              if (day.hoursLogged >= targetHours) {
                dotColor =
                  "bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-700 text-white font-bold";
                status = "Goal Met";
              } else if (day.hoursLogged > 0) {
                dotColor =
                  "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-400 font-semibold";
                status = "In Progress";
              } else if (day.isWeekend) {
                dotColor = "bg-muted/10 border-muted-foreground/10 text-muted-foreground/40";
                status = "Weekend";
              }

              return (
                <div
                  key={day.dateKey}
                  className="flex flex-col items-center gap-1 flex-1 min-w-0"
                  title={`${day.formattedDate}: ${day.hoursLogged.toFixed(1)} / ${targetHours}h (${status})`}
                >
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-[10px] border transition-all duration-300 hover:scale-120 hover:rotate-6 cursor-help ${dotColor} ${
                      day.isToday
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
                        : ""
                    }`}
                  >
                    {day.hoursLogged >= targetHours ? "✓" : day.hoursLogged > 0 ? "~" : ""}
                  </div>
                  <span
                    className={`text-[9px] font-medium ${
                      day.isToday ? "text-primary font-bold animate-pulse" : "text-muted-foreground"
                    }`}
                  >
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestones Checklist */}
        <div className="space-y-2 mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground">Milestones (Last 14 Days)</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Early Bird */}
            <div
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all duration-500 hover:scale-[1.02] ${
                milestones.earlyBird
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium milestone-glow-amber shimmer-sweep"
                  : "bg-muted/10 border-border/50 text-muted-foreground opacity-50"
              }`}
              title="Log time or start timer before 9:00 AM"
            >
              <Sun
                className={`size-4 shrink-0 ${
                  milestones.earlyBird
                    ? "text-amber-500 fill-amber-500/20 animate-float-subtle"
                    : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0">
                <p className="font-semibold truncate leading-tight">Early Bird</p>
                <p className="text-[9px] text-muted-foreground truncate">Before 9 AM</p>
              </div>
            </div>

            {/* Super Logger */}
            <div
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all duration-500 hover:scale-[1.02] ${
                milestones.superLogger
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-medium milestone-glow-indigo shimmer-sweep"
                  : "bg-muted/10 border-border/50 text-muted-foreground opacity-50"
              }`}
              title="Log 10 or more hours in a single day"
            >
              <Rocket
                className={`size-4 shrink-0 ${
                  milestones.superLogger
                    ? "text-indigo-500 fill-indigo-500/20 animate-float-subtle"
                    : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0">
                <p className="font-semibold truncate leading-tight">Super Logger</p>
                <p className="text-[9px] text-muted-foreground truncate">10+ hrs in a day</p>
              </div>
            </div>

            {/* Streak Champ */}
            <div
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all duration-500 hover:scale-[1.02] ${
                milestones.streakChamp
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400 font-medium milestone-glow-orange shimmer-sweep"
                  : "bg-muted/10 border-border/50 text-muted-foreground opacity-50"
              }`}
              title="Maintain a streak of 3 or more days"
            >
              <Flame
                className={`size-4 shrink-0 ${
                  milestones.streakChamp
                    ? "text-orange-500 fill-orange-500/20 animate-flame-flicker"
                    : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0">
                <p className="font-semibold truncate leading-tight">Streak Champ</p>
                <p className="text-[9px] text-muted-foreground truncate">3+ day streak</p>
              </div>
            </div>

            {/* Perfect Week */}
            <div
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all duration-500 hover:scale-[1.02] ${
                milestones.perfectWeek
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium milestone-glow-emerald shimmer-sweep"
                  : "bg-muted/10 border-border/50 text-muted-foreground opacity-50"
              }`}
              title="Meet daily target hours on all weekdays (Mon-Fri) this or last week"
            >
              <Trophy
                className={`size-4 shrink-0 ${
                  milestones.perfectWeek
                    ? "text-emerald-500 fill-emerald-500/20 animate-float-subtle"
                    : "text-muted-foreground"
                }`}
              />
              <div className="min-w-0">
                <p className="font-semibold truncate leading-tight">Perfect Week</p>
                <p className="text-[9px] text-muted-foreground truncate">Mon-Fri met</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
