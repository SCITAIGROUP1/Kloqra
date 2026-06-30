import type { ActiveTimerDto } from "@kloqra/contracts";
import { create } from "zustand";

interface TimerState {
  active: ActiveTimerDto | null;
  elapsedSec: number;
  isPaused: boolean;
  setActive: (t: ActiveTimerDto | null) => void;
  tick: () => void;
}

export function normalizeActiveTimer(t: ActiveTimerDto | null | undefined): ActiveTimerDto | null {
  if (!t || typeof t !== "object") return null;
  if (!t.taskId || !t.startedAt || !t.userId || !t.workspaceId) return null;
  if (!Number.isFinite(new Date(t.startedAt).getTime())) return null;
  return t;
}

export function isActiveTimer(t: ActiveTimerDto | null | undefined): t is ActiveTimerDto {
  return normalizeActiveTimer(t) !== null;
}

function elapsedFromActive(active: ActiveTimerDto | null): number {
  if (!active) return 0;
  if (active.isPaused) {
    return active.elapsedSec;
  }
  const accumulated = active.accumulatedSec ?? 0;
  const startedMs = new Date(active.startedAt).getTime();
  if (Number.isFinite(startedMs)) {
    const currentSegmentSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
    return accumulated + currentSegmentSec;
  }
  return active.elapsedSec;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  active: null,
  elapsedSec: 0,
  isPaused: false,
  setActive: (active) => {
    const normalized = normalizeActiveTimer(active);
    set({
      active: normalized,
      elapsedSec: elapsedFromActive(normalized),
      isPaused: normalized?.isPaused ?? false
    });
  },
  tick: () => {
    const { active } = get();
    if (!isActiveTimer(active) || active.isPaused) return;
    set({ elapsedSec: elapsedFromActive(active) });
  }
}));
