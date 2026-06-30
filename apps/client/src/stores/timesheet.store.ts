import type { TimeLogDto } from "@kloqra/contracts";
import { create } from "zustand";

interface TimesheetState {
  logs: TimeLogDto[];
  setLogs: (logs: TimeLogDto[]) => void;
}

export const useTimesheetStore = create<TimesheetState>((set) => ({
  logs: [],
  setLogs: (logs) => set({ logs })
}));
