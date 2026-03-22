import { create } from 'zustand'

interface LoadingState {
  progress: number
  stage: string
  isComplete: boolean
  setProgress: (progress: number, stage: string) => void
  complete: () => void
  reset: () => void
}

/**
 * Tracks game loading progress.
 *
 * Stages:
 * - 0%:  "Connecting..."
 * - 20%: "Loading map..."
 * - 40%: "Loading tokens..."
 * - 60%: "Preloading models..."
 * - 80%: "Preparing scene..."
 * - 100%: "Ready"
 */
export const useLoadingStore = create<LoadingState>((set) => ({
  progress: 0,
  stage: 'Connecting...',
  isComplete: false,

  setProgress: (progress, stage) => set({ progress, stage }),

  complete: () => set({ progress: 100, stage: 'Ready', isComplete: true }),

  reset: () => set({ progress: 0, stage: 'Connecting...', isComplete: false }),
}))
