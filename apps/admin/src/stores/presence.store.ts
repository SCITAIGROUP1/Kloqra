import type { PresenceSnapshotDto } from "@kloqra/contracts";
import { create } from "zustand";

interface PresenceState {
  snapshot: PresenceSnapshotDto | null;
  setSnapshot: (s: PresenceSnapshotDto) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot })
}));
