import { create } from 'zustand';

/** Lightweight cross-screen hints (not persisted): e.g. the dock coin pulses when a spin is ready. */
interface HintsState {
  spinReady: boolean;
  setSpinReady: (v: boolean) => void;
}

export const useHints = create<HintsState>((set) => ({
  spinReady: false,
  setSpinReady: (spinReady) => set({ spinReady }),
}));
