import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  toast: string | null;
  setSidebarOpen: (v: boolean) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toast: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null })
}));
