import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AudioLayer } from '@/lib/audio/audio-assets'

// ─── Types ───────────────────────────────────

export interface LayerState {
  trackId: string | null
  isPlaying: boolean
}

export interface AudioStoreState {
  // Per-layer volume (0-1)
  volumes: Record<AudioLayer, number>
  // Master volume (0-1)
  masterVolume: number
  // Mute state
  muted: Record<AudioLayer, boolean>
  masterMuted: boolean
  // Currently playing per layer
  layers: Record<AudioLayer, LayerState>

  // Actions
  setVolume: (layer: AudioLayer, volume: number) => void
  setMasterVolume: (volume: number) => void
  toggleMute: (layer: AudioLayer) => void
  toggleMasterMute: () => void
  setLayerTrack: (layer: AudioLayer, trackId: string | null) => void
  setLayerPlaying: (layer: AudioLayer, isPlaying: boolean) => void
  getEffectiveVolume: (layer: AudioLayer) => number
}

// ─── Defaults ────────────────────────────────

const DEFAULT_VOLUMES: Record<AudioLayer, number> = {
  ambience: 0.4,
  music: 0.3,
  sfx: 0.6,
}

const DEFAULT_MUTED: Record<AudioLayer, boolean> = {
  ambience: false,
  music: false,
  sfx: false,
}

const DEFAULT_LAYERS: Record<AudioLayer, LayerState> = {
  ambience: { trackId: null, isPlaying: false },
  music: { trackId: null, isPlaying: false },
  sfx: { trackId: null, isPlaying: false },
}

// ─── Store ───────────────────────────────────

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set, get) => ({
      volumes: { ...DEFAULT_VOLUMES },
      masterVolume: 0.8,
      muted: { ...DEFAULT_MUTED },
      masterMuted: false,
      layers: { ...DEFAULT_LAYERS },

      setVolume: (layer, volume) =>
        set((state) => ({
          volumes: { ...state.volumes, [layer]: Math.max(0, Math.min(1, volume)) },
        })),

      setMasterVolume: (volume) =>
        set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

      toggleMute: (layer) =>
        set((state) => ({
          muted: { ...state.muted, [layer]: !state.muted[layer] },
        })),

      toggleMasterMute: () =>
        set((state) => ({ masterMuted: !state.masterMuted })),

      setLayerTrack: (layer, trackId) =>
        set((state) => ({
          layers: {
            ...state.layers,
            [layer]: { ...state.layers[layer], trackId },
          },
        })),

      setLayerPlaying: (layer, isPlaying) =>
        set((state) => ({
          layers: {
            ...state.layers,
            [layer]: { ...state.layers[layer], isPlaying },
          },
        })),

      getEffectiveVolume: (layer) => {
        const state = get()
        if (state.masterMuted || state.muted[layer]) return 0
        return state.masterVolume * state.volumes[layer]
      },
    }),
    {
      name: 'dndmanager-audio',
      // Only persist volume/mute preferences, not playback state
      partialize: (state) => ({
        volumes: state.volumes,
        masterVolume: state.masterVolume,
        muted: state.muted,
        masterMuted: state.masterMuted,
      }),
    }
  )
)
