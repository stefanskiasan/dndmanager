# Phase 3.4: Audio Atmosphere System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-layer audio atmosphere system (ambience, music, sound effects) that reacts to game state changes — switching music on encounter start/end, playing SFX on dice rolls and combat events, and providing per-layer volume controls.

**Architecture:** Audio manager and asset library live in `apps/web/lib/audio/`. Zustand store tracks playback state and volumes. UI controls render inside the game overlay. The audio system subscribes to the existing game store and game-runtime events to auto-switch tracks. All audio playback uses Howler.js (wrapping Web Audio API).

**Tech Stack:** TypeScript strict, Howler.js, React, Zustand, shadcn/ui, lucide-react

---

## File Structure

```
apps/web/lib/audio/
├── audio-manager.ts              → Core manager: load, play, stop, crossfade per layer
├── audio-assets.ts               → Track library: all available tracks by category
├── audio-scene-map.ts            → Maps game state (mode, room type) to track selections
├── sfx-triggers.ts               → Fires SFX in response to game events

apps/web/lib/stores/
├── audio-store.ts                → Zustand store: volumes, mute, current tracks

apps/web/components/game/
├── audio/
│   ├── AudioPlayer.tsx           → Volume sliders + mute per layer, master volume
│   └── AudioProvider.tsx         → Initializes audio system, subscribes to game store
```

---

### Task 1: Add Howler.js Dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install howler**

Run from the repo root:
```bash
cd apps/web && pnpm add howler && pnpm add -D @types/howler
```

This adds `howler` (MIT, ~10KB gzip, wraps Web Audio API with HTML5 Audio fallback) and its TypeScript types.

**Commit:** `feat(audio): add howler.js dependency`

---

### Task 2: Audio Asset Library

**Files:**
- Create: `apps/web/lib/audio/audio-assets.ts`
- Test: `apps/web/lib/audio/__tests__/audio-assets.test.ts`

- [ ] **Step 1: Define track types and asset library**

`apps/web/lib/audio/audio-assets.ts`:
```typescript
// ─── Track Categories ────────────────────────

export type AmbienceCategory =
  | 'dungeon'
  | 'forest'
  | 'tavern'
  | 'cave'
  | 'town'
  | 'ocean'
  | 'temple'
  | 'silence'

export type MusicCategory =
  | 'exploration'
  | 'combat'
  | 'boss'
  | 'victory'
  | 'defeat'
  | 'mystery'
  | 'tavern'
  | 'rest'

export type SfxCategory =
  | 'dice_roll'
  | 'hit_normal'
  | 'hit_critical'
  | 'miss'
  | 'spell_cast'
  | 'spell_fire'
  | 'spell_ice'
  | 'spell_heal'
  | 'door_open'
  | 'door_close'
  | 'chest_open'
  | 'coin_drop'
  | 'level_up'
  | 'encounter_start'
  | 'encounter_end'
  | 'death'
  | 'ui_click'
  | 'ui_hover'

export type AudioCategory = AmbienceCategory | MusicCategory | SfxCategory

// ─── Track Definition ────────────────────────

export type AudioLayer = 'ambience' | 'music' | 'sfx'

export interface AudioTrack {
  id: string
  name: string
  layer: AudioLayer
  category: string
  url: string
  loop: boolean
  volume: number        // default volume 0-1
  fadeDuration: number  // crossfade ms
}

// ─── Asset Library ───────────────────────────
// Placeholder URLs — replace with actual hosted assets.
// Using free RPG audio from OpenGameArt / freesound conventions.
// Format: /audio/{layer}/{filename}.webm
// In production these will be served from a CDN or public/ folder.

const AUDIO_BASE = '/audio'

export const AMBIENCE_TRACKS: AudioTrack[] = [
  {
    id: 'amb-dungeon-01',
    name: 'Dark Dungeon',
    layer: 'ambience',
    category: 'dungeon',
    url: `${AUDIO_BASE}/ambience/dungeon-01.webm`,
    loop: true,
    volume: 0.4,
    fadeDuration: 3000,
  },
  {
    id: 'amb-forest-01',
    name: 'Forest Ambience',
    layer: 'ambience',
    category: 'forest',
    url: `${AUDIO_BASE}/ambience/forest-01.webm`,
    loop: true,
    volume: 0.35,
    fadeDuration: 3000,
  },
  {
    id: 'amb-tavern-01',
    name: 'Bustling Tavern',
    layer: 'ambience',
    category: 'tavern',
    url: `${AUDIO_BASE}/ambience/tavern-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
  {
    id: 'amb-cave-01',
    name: 'Dripping Cave',
    layer: 'ambience',
    category: 'cave',
    url: `${AUDIO_BASE}/ambience/cave-01.webm`,
    loop: true,
    volume: 0.35,
    fadeDuration: 3000,
  },
  {
    id: 'amb-town-01',
    name: 'Busy Town',
    layer: 'ambience',
    category: 'town',
    url: `${AUDIO_BASE}/ambience/town-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2500,
  },
  {
    id: 'amb-ocean-01',
    name: 'Ocean Waves',
    layer: 'ambience',
    category: 'ocean',
    url: `${AUDIO_BASE}/ambience/ocean-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 3000,
  },
  {
    id: 'amb-temple-01',
    name: 'Sacred Temple',
    layer: 'ambience',
    category: 'temple',
    url: `${AUDIO_BASE}/ambience/temple-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 3000,
  },
]

export const MUSIC_TRACKS: AudioTrack[] = [
  {
    id: 'mus-exploration-01',
    name: 'Wandering Theme',
    layer: 'music',
    category: 'exploration',
    url: `${AUDIO_BASE}/music/exploration-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
  {
    id: 'mus-exploration-02',
    name: 'Quiet Journey',
    layer: 'music',
    category: 'exploration',
    url: `${AUDIO_BASE}/music/exploration-02.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
  {
    id: 'mus-combat-01',
    name: 'Battle Drums',
    layer: 'music',
    category: 'combat',
    url: `${AUDIO_BASE}/music/combat-01.webm`,
    loop: true,
    volume: 0.4,
    fadeDuration: 1000,
  },
  {
    id: 'mus-combat-02',
    name: 'Clash of Steel',
    layer: 'music',
    category: 'combat',
    url: `${AUDIO_BASE}/music/combat-02.webm`,
    loop: true,
    volume: 0.4,
    fadeDuration: 1000,
  },
  {
    id: 'mus-boss-01',
    name: 'Boss Encounter',
    layer: 'music',
    category: 'boss',
    url: `${AUDIO_BASE}/music/boss-01.webm`,
    loop: true,
    volume: 0.45,
    fadeDuration: 1500,
  },
  {
    id: 'mus-victory-01',
    name: 'Victory Fanfare',
    layer: 'music',
    category: 'victory',
    url: `${AUDIO_BASE}/music/victory-01.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 500,
  },
  {
    id: 'mus-tavern-01',
    name: 'Tavern Jig',
    layer: 'music',
    category: 'tavern',
    url: `${AUDIO_BASE}/music/tavern-01.webm`,
    loop: true,
    volume: 0.25,
    fadeDuration: 2000,
  },
  {
    id: 'mus-rest-01',
    name: 'Campfire Rest',
    layer: 'music',
    category: 'rest',
    url: `${AUDIO_BASE}/music/rest-01.webm`,
    loop: true,
    volume: 0.2,
    fadeDuration: 3000,
  },
  {
    id: 'mus-mystery-01',
    name: 'Dark Mystery',
    layer: 'music',
    category: 'mystery',
    url: `${AUDIO_BASE}/music/mystery-01.webm`,
    loop: true,
    volume: 0.3,
    fadeDuration: 2000,
  },
]

export const SFX_TRACKS: AudioTrack[] = [
  {
    id: 'sfx-dice-roll',
    name: 'Dice Roll',
    layer: 'sfx',
    category: 'dice_roll',
    url: `${AUDIO_BASE}/sfx/dice-roll.webm`,
    loop: false,
    volume: 0.6,
    fadeDuration: 0,
  },
  {
    id: 'sfx-hit-normal',
    name: 'Hit',
    layer: 'sfx',
    category: 'hit_normal',
    url: `${AUDIO_BASE}/sfx/hit-normal.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-hit-critical',
    name: 'Critical Hit',
    layer: 'sfx',
    category: 'hit_critical',
    url: `${AUDIO_BASE}/sfx/hit-critical.webm`,
    loop: false,
    volume: 0.7,
    fadeDuration: 0,
  },
  {
    id: 'sfx-miss',
    name: 'Miss',
    layer: 'sfx',
    category: 'miss',
    url: `${AUDIO_BASE}/sfx/miss.webm`,
    loop: false,
    volume: 0.4,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-cast',
    name: 'Spell Cast',
    layer: 'sfx',
    category: 'spell_cast',
    url: `${AUDIO_BASE}/sfx/spell-cast.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-fire',
    name: 'Fire Spell',
    layer: 'sfx',
    category: 'spell_fire',
    url: `${AUDIO_BASE}/sfx/spell-fire.webm`,
    loop: false,
    volume: 0.55,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-ice',
    name: 'Ice Spell',
    layer: 'sfx',
    category: 'spell_ice',
    url: `${AUDIO_BASE}/sfx/spell-ice.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-spell-heal',
    name: 'Healing',
    layer: 'sfx',
    category: 'spell_heal',
    url: `${AUDIO_BASE}/sfx/spell-heal.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-door-open',
    name: 'Door Open',
    layer: 'sfx',
    category: 'door_open',
    url: `${AUDIO_BASE}/sfx/door-open.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-door-close',
    name: 'Door Close',
    layer: 'sfx',
    category: 'door_close',
    url: `${AUDIO_BASE}/sfx/door-close.webm`,
    loop: false,
    volume: 0.45,
    fadeDuration: 0,
  },
  {
    id: 'sfx-chest-open',
    name: 'Chest Open',
    layer: 'sfx',
    category: 'chest_open',
    url: `${AUDIO_BASE}/sfx/chest-open.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-coin-drop',
    name: 'Coin Drop',
    layer: 'sfx',
    category: 'coin_drop',
    url: `${AUDIO_BASE}/sfx/coin-drop.webm`,
    loop: false,
    volume: 0.4,
    fadeDuration: 0,
  },
  {
    id: 'sfx-level-up',
    name: 'Level Up',
    layer: 'sfx',
    category: 'level_up',
    url: `${AUDIO_BASE}/sfx/level-up.webm`,
    loop: false,
    volume: 0.6,
    fadeDuration: 0,
  },
  {
    id: 'sfx-encounter-start',
    name: 'Encounter Start',
    layer: 'sfx',
    category: 'encounter_start',
    url: `${AUDIO_BASE}/sfx/encounter-start.webm`,
    loop: false,
    volume: 0.6,
    fadeDuration: 0,
  },
  {
    id: 'sfx-encounter-end',
    name: 'Encounter End',
    layer: 'sfx',
    category: 'encounter_end',
    url: `${AUDIO_BASE}/sfx/encounter-end.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
  {
    id: 'sfx-death',
    name: 'Death',
    layer: 'sfx',
    category: 'death',
    url: `${AUDIO_BASE}/sfx/death.webm`,
    loop: false,
    volume: 0.5,
    fadeDuration: 0,
  },
]

// ─── Lookup Helpers ──────────────────────────

export const ALL_TRACKS: AudioTrack[] = [
  ...AMBIENCE_TRACKS,
  ...MUSIC_TRACKS,
  ...SFX_TRACKS,
]

export function getTrackById(id: string): AudioTrack | undefined {
  return ALL_TRACKS.find((t) => t.id === id)
}

export function getTracksByLayer(layer: AudioLayer): AudioTrack[] {
  return ALL_TRACKS.filter((t) => t.layer === layer)
}

export function getTracksByCategory(category: string): AudioTrack[] {
  return ALL_TRACKS.filter((t) => t.category === category)
}

export function getRandomTrack(layer: AudioLayer, category: string): AudioTrack | undefined {
  const tracks = ALL_TRACKS.filter((t) => t.layer === layer && t.category === category)
  if (tracks.length === 0) return undefined
  return tracks[Math.floor(Math.random() * tracks.length)]
}
```

- [ ] **Step 2: Write tests for asset library lookups**

`apps/web/lib/audio/__tests__/audio-assets.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  ALL_TRACKS,
  AMBIENCE_TRACKS,
  MUSIC_TRACKS,
  SFX_TRACKS,
  getTrackById,
  getTracksByLayer,
  getTracksByCategory,
  getRandomTrack,
} from '../audio-assets'

describe('audio-assets', () => {
  it('ALL_TRACKS contains all layer tracks', () => {
    expect(ALL_TRACKS.length).toBe(
      AMBIENCE_TRACKS.length + MUSIC_TRACKS.length + SFX_TRACKS.length
    )
  })

  it('every track has a unique id', () => {
    const ids = ALL_TRACKS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getTrackById returns correct track', () => {
    const track = getTrackById('mus-combat-01')
    expect(track).toBeDefined()
    expect(track!.name).toBe('Battle Drums')
    expect(track!.layer).toBe('music')
  })

  it('getTrackById returns undefined for unknown id', () => {
    expect(getTrackById('nonexistent')).toBeUndefined()
  })

  it('getTracksByLayer returns only that layer', () => {
    const ambience = getTracksByLayer('ambience')
    expect(ambience.length).toBe(AMBIENCE_TRACKS.length)
    expect(ambience.every((t) => t.layer === 'ambience')).toBe(true)
  })

  it('getTracksByCategory filters correctly', () => {
    const combat = getTracksByCategory('combat')
    expect(combat.length).toBeGreaterThan(0)
    expect(combat.every((t) => t.category === 'combat')).toBe(true)
  })

  it('getRandomTrack returns a track from the right layer+category', () => {
    const track = getRandomTrack('music', 'combat')
    expect(track).toBeDefined()
    expect(track!.layer).toBe('music')
    expect(track!.category).toBe('combat')
  })

  it('getRandomTrack returns undefined for empty category', () => {
    expect(getRandomTrack('sfx', 'nonexistent')).toBeUndefined()
  })
})
```

**Commit:** `feat(audio): add audio asset library with track definitions`

---

### Task 3: Zustand Audio Store

**Files:**
- Create: `apps/web/lib/stores/audio-store.ts`
- Test: `apps/web/lib/audio/__tests__/audio-store.test.ts`

- [ ] **Step 1: Create the audio store**

`apps/web/lib/stores/audio-store.ts`:
```typescript
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
```

- [ ] **Step 2: Write store tests**

`apps/web/lib/audio/__tests__/audio-store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAudioStore } from '@/lib/stores/audio-store'

describe('audio-store', () => {
  beforeEach(() => {
    // Reset store between tests
    useAudioStore.setState({
      volumes: { ambience: 0.4, music: 0.3, sfx: 0.6 },
      masterVolume: 0.8,
      muted: { ambience: false, music: false, sfx: false },
      masterMuted: false,
      layers: {
        ambience: { trackId: null, isPlaying: false },
        music: { trackId: null, isPlaying: false },
        sfx: { trackId: null, isPlaying: false },
      },
    })
  })

  it('setVolume clamps to 0-1', () => {
    useAudioStore.getState().setVolume('music', 1.5)
    expect(useAudioStore.getState().volumes.music).toBe(1)

    useAudioStore.getState().setVolume('music', -0.5)
    expect(useAudioStore.getState().volumes.music).toBe(0)
  })

  it('setMasterVolume clamps to 0-1', () => {
    useAudioStore.getState().setMasterVolume(2)
    expect(useAudioStore.getState().masterVolume).toBe(1)
  })

  it('toggleMute flips mute state', () => {
    expect(useAudioStore.getState().muted.sfx).toBe(false)
    useAudioStore.getState().toggleMute('sfx')
    expect(useAudioStore.getState().muted.sfx).toBe(true)
    useAudioStore.getState().toggleMute('sfx')
    expect(useAudioStore.getState().muted.sfx).toBe(false)
  })

  it('toggleMasterMute flips master mute', () => {
    expect(useAudioStore.getState().masterMuted).toBe(false)
    useAudioStore.getState().toggleMasterMute()
    expect(useAudioStore.getState().masterMuted).toBe(true)
  })

  it('getEffectiveVolume multiplies master * layer', () => {
    useAudioStore.setState({ masterVolume: 0.5, volumes: { ambience: 0.4, music: 0.6, sfx: 0.8 } })
    expect(useAudioStore.getState().getEffectiveVolume('music')).toBeCloseTo(0.3)
  })

  it('getEffectiveVolume returns 0 when master muted', () => {
    useAudioStore.setState({ masterMuted: true })
    expect(useAudioStore.getState().getEffectiveVolume('music')).toBe(0)
  })

  it('getEffectiveVolume returns 0 when layer muted', () => {
    useAudioStore.setState({ muted: { ambience: false, music: true, sfx: false } })
    expect(useAudioStore.getState().getEffectiveVolume('music')).toBe(0)
  })

  it('setLayerTrack updates track id', () => {
    useAudioStore.getState().setLayerTrack('music', 'mus-combat-01')
    expect(useAudioStore.getState().layers.music.trackId).toBe('mus-combat-01')
  })

  it('setLayerPlaying updates playing state', () => {
    useAudioStore.getState().setLayerPlaying('ambience', true)
    expect(useAudioStore.getState().layers.ambience.isPlaying).toBe(true)
  })
})
```

**Commit:** `feat(audio): add Zustand audio store with volume/mute persistence`

---

### Task 4: Audio Manager (Howler.js Core)

**Files:**
- Create: `apps/web/lib/audio/audio-manager.ts`

- [ ] **Step 1: Implement the audio manager**

`apps/web/lib/audio/audio-manager.ts`:
```typescript
import { Howl, Howler } from 'howler'
import type { AudioLayer, AudioTrack } from './audio-assets'
import { getTrackById } from './audio-assets'
import { useAudioStore } from '@/lib/stores/audio-store'

// ─── Types ───────────────────────────────────

interface ActiveSound {
  howl: Howl
  track: AudioTrack
}

// ─── Audio Manager ───────────────────────────
// Singleton that owns all Howl instances.
// One active sound per layer (ambience, music).
// SFX layer can have multiple concurrent sounds.

class AudioManager {
  private layers: Record<AudioLayer, ActiveSound | null> = {
    ambience: null,
    music: null,
    sfx: null, // SFX doesn't use this slot — see playSfx()
  }

  private activeSfx: Howl[] = []
  private maxConcurrentSfx = 8

  // ─── Layer Playback ──────────────────────

  /**
   * Play a track on a layer (ambience or music).
   * If a track is already playing on that layer, crossfade to the new one.
   */
  play(layer: 'ambience' | 'music', trackId: string): void {
    const track = getTrackById(trackId)
    if (!track) {
      console.warn(`[AudioManager] Track not found: ${trackId}`)
      return
    }

    const store = useAudioStore.getState()
    const effectiveVolume = store.getEffectiveVolume(layer)

    const current = this.layers[layer]

    // Already playing the same track
    if (current && current.track.id === trackId) return

    // Create new Howl
    const howl = new Howl({
      src: [track.url],
      loop: track.loop,
      volume: 0, // start silent for fade-in
      html5: true, // stream large files
      preload: true,
    })

    const newSound: ActiveSound = { howl, track }

    // Crossfade: fade out old, fade in new
    if (current) {
      const fadeDuration = track.fadeDuration
      current.howl.fade(current.howl.volume(), 0, fadeDuration)
      setTimeout(() => {
        current.howl.unload()
      }, fadeDuration + 100)
    }

    howl.play()
    howl.fade(0, effectiveVolume, track.fadeDuration || 1000)

    this.layers[layer] = newSound

    // Update store
    store.setLayerTrack(layer, trackId)
    store.setLayerPlaying(layer, true)
  }

  /**
   * Stop a layer with fade-out.
   */
  stop(layer: 'ambience' | 'music', fadeDuration = 1000): void {
    const current = this.layers[layer]
    if (!current) return

    current.howl.fade(current.howl.volume(), 0, fadeDuration)
    setTimeout(() => {
      current.howl.unload()
    }, fadeDuration + 100)

    this.layers[layer] = null

    const store = useAudioStore.getState()
    store.setLayerTrack(layer, null)
    store.setLayerPlaying(layer, false)
  }

  // ─── SFX ─────────────────────────────────

  /**
   * Play a one-shot sound effect. Multiple SFX can overlap.
   */
  playSfx(trackId: string): void {
    const track = getTrackById(trackId)
    if (!track) {
      console.warn(`[AudioManager] SFX track not found: ${trackId}`)
      return
    }

    const store = useAudioStore.getState()
    const effectiveVolume = store.getEffectiveVolume('sfx')

    if (effectiveVolume === 0) return

    // Limit concurrent SFX
    if (this.activeSfx.length >= this.maxConcurrentSfx) {
      const oldest = this.activeSfx.shift()
      oldest?.unload()
    }

    const howl = new Howl({
      src: [track.url],
      volume: effectiveVolume * track.volume,
      loop: false,
      preload: true,
    })

    this.activeSfx.push(howl)

    howl.on('end', () => {
      const idx = this.activeSfx.indexOf(howl)
      if (idx !== -1) this.activeSfx.splice(idx, 1)
      howl.unload()
    })

    howl.play()
  }

  // ─── Volume Sync ─────────────────────────

  /**
   * Called when store volume/mute changes.
   * Syncs Howl volumes to match store state.
   */
  syncVolumes(): void {
    const store = useAudioStore.getState()

    for (const layer of ['ambience', 'music'] as const) {
      const active = this.layers[layer]
      if (!active) continue

      const vol = store.getEffectiveVolume(layer)
      active.howl.volume(vol)
    }
  }

  // ─── Global Controls ─────────────────────

  /**
   * Pause all audio (e.g. when tab loses focus).
   */
  pauseAll(): void {
    Howler.mute(true)
  }

  /**
   * Resume all audio.
   */
  resumeAll(): void {
    const store = useAudioStore.getState()
    Howler.mute(store.masterMuted)
  }

  /**
   * Stop everything and clean up all Howl instances.
   */
  destroy(): void {
    for (const layer of ['ambience', 'music'] as const) {
      const active = this.layers[layer]
      if (active) {
        active.howl.unload()
        this.layers[layer] = null
      }
    }
    for (const sfx of this.activeSfx) {
      sfx.unload()
    }
    this.activeSfx = []
  }
}

// ─── Singleton Export ────────────────────────

export const audioManager = new AudioManager()
```

**Commit:** `feat(audio): implement AudioManager with Howler.js crossfade and SFX`

---

### Task 5: Scene-Based Audio Selection

**Files:**
- Create: `apps/web/lib/audio/audio-scene-map.ts`
- Test: `apps/web/lib/audio/__tests__/audio-scene-map.test.ts`

- [ ] **Step 1: Define scene-to-audio mapping**

`apps/web/lib/audio/audio-scene-map.ts`:
```typescript
import type { GameMode } from '@dndmanager/game-runtime'
import type { AmbienceCategory, MusicCategory } from './audio-assets'
import { getRandomTrack } from './audio-assets'

// ─── Room / Scene Types ──────────────────────
// These map to the mapTiles string in game-store
// or can be set explicitly by the GM.

export type SceneType =
  | 'dungeon'
  | 'cave'
  | 'forest'
  | 'tavern'
  | 'town'
  | 'ocean'
  | 'temple'
  | 'generic'

// ─── Mapping Tables ─────────────────────────

/** Map a scene type to its ambience category */
const SCENE_TO_AMBIENCE: Record<SceneType, AmbienceCategory> = {
  dungeon: 'dungeon',
  cave: 'cave',
  forest: 'forest',
  tavern: 'tavern',
  town: 'town',
  ocean: 'ocean',
  temple: 'temple',
  generic: 'dungeon',
}

/** Map game mode to music category */
const MODE_TO_MUSIC: Record<GameMode, MusicCategory> = {
  exploration: 'exploration',
  encounter: 'combat',
  downtime: 'rest',
}

// ─── Map Tile String to Scene Type ──────────

/** Best-effort parse of mapTiles string to a scene type */
export function parseSceneType(mapTiles: string): SceneType {
  const lower = mapTiles.toLowerCase()

  if (lower.includes('cave') || lower.includes('stone')) return 'cave'
  if (lower.includes('dungeon') || lower.includes('crypt')) return 'dungeon'
  if (lower.includes('forest') || lower.includes('grass') || lower.includes('tree')) return 'forest'
  if (lower.includes('tavern') || lower.includes('inn') || lower.includes('wood')) return 'tavern'
  if (lower.includes('town') || lower.includes('city') || lower.includes('cobble')) return 'town'
  if (lower.includes('ocean') || lower.includes('water') || lower.includes('ship')) return 'ocean'
  if (lower.includes('temple') || lower.includes('church') || lower.includes('shrine')) return 'temple'

  return 'generic'
}

// ─── Selection Functions ─────────────────────

export interface AudioSelection {
  ambienceTrackId: string | null
  musicTrackId: string | null
}

/**
 * Given the current game mode and scene/map info, pick appropriate tracks.
 */
export function selectAudioForState(
  mode: GameMode,
  mapTiles: string,
  options?: {
    isBoss?: boolean
  }
): AudioSelection {
  const scene = parseSceneType(mapTiles)

  // Ambience: based on scene, stays the same during combat
  const ambienceCategory = SCENE_TO_AMBIENCE[scene]
  const ambienceTrack = getRandomTrack('ambience', ambienceCategory)

  // Music: based on mode (with boss override)
  let musicCategory = MODE_TO_MUSIC[mode]
  if (mode === 'encounter' && options?.isBoss) {
    musicCategory = 'boss'
  }
  const musicTrack = getRandomTrack('music', musicCategory)

  return {
    ambienceTrackId: ambienceTrack?.id ?? null,
    musicTrackId: musicTrack?.id ?? null,
  }
}

/**
 * Get the music category override for a specific scene type + mode combo.
 * E.g. tavern in exploration mode should play tavern music, not generic exploration.
 */
export function selectMusicForScene(mode: GameMode, scene: SceneType): MusicCategory {
  // Scene-specific music overrides during exploration
  if (mode === 'exploration' || mode === 'downtime') {
    if (scene === 'tavern') return 'tavern'
    if (scene === 'temple') return 'mystery'
  }

  return MODE_TO_MUSIC[mode]
}
```

- [ ] **Step 2: Write tests for scene mapping**

`apps/web/lib/audio/__tests__/audio-scene-map.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseSceneType, selectAudioForState, selectMusicForScene } from '../audio-scene-map'

describe('audio-scene-map', () => {
  describe('parseSceneType', () => {
    it('detects cave from map tiles', () => {
      expect(parseSceneType('cave-stone')).toBe('cave')
    })

    it('detects forest', () => {
      expect(parseSceneType('deep-forest-floor')).toBe('forest')
    })

    it('detects tavern from wood', () => {
      expect(parseSceneType('wood-planks')).toBe('tavern')
    })

    it('detects dungeon from crypt', () => {
      expect(parseSceneType('ancient-crypt')).toBe('dungeon')
    })

    it('returns generic for unknown', () => {
      expect(parseSceneType('xyz-unknown')).toBe('generic')
    })
  })

  describe('selectAudioForState', () => {
    it('returns track IDs for exploration mode', () => {
      const result = selectAudioForState('exploration', 'forest-floor')
      expect(result.ambienceTrackId).toBeDefined()
      expect(result.musicTrackId).toBeDefined()
    })

    it('returns combat music for encounter mode', () => {
      const result = selectAudioForState('encounter', 'dungeon-tiles')
      expect(result.musicTrackId).toMatch(/^mus-combat/)
    })

    it('returns boss music when isBoss is true', () => {
      const result = selectAudioForState('encounter', 'dungeon-tiles', { isBoss: true })
      expect(result.musicTrackId).toMatch(/^mus-boss/)
    })
  })

  describe('selectMusicForScene', () => {
    it('returns tavern music in tavern during exploration', () => {
      expect(selectMusicForScene('exploration', 'tavern')).toBe('tavern')
    })

    it('returns combat during encounter regardless of scene', () => {
      expect(selectMusicForScene('encounter', 'tavern')).toBe('combat')
    })

    it('returns mystery for temple exploration', () => {
      expect(selectMusicForScene('exploration', 'temple')).toBe('mystery')
    })

    it('returns rest for downtime', () => {
      expect(selectMusicForScene('downtime', 'generic')).toBe('rest')
    })
  })
})
```

**Commit:** `feat(audio): add scene-based audio selection and map tile parsing`

---

### Task 6: SFX Event Triggers

**Files:**
- Create: `apps/web/lib/audio/sfx-triggers.ts`

- [ ] **Step 1: Map game events to SFX track IDs**

`apps/web/lib/audio/sfx-triggers.ts`:
```typescript
import type { GameEventType } from '@dndmanager/game-runtime'
import { audioManager } from './audio-manager'

// ─── Event → SFX Mapping ────────────────────

/**
 * Maps game event types to SFX track IDs.
 * Some events need additional data inspection to pick the right SFX.
 */
const EVENT_SFX_MAP: Partial<Record<GameEventType, string>> = {
  encounter_start: 'sfx-encounter-start',
  encounter_end: 'sfx-encounter-end',
  damage_dealt: 'sfx-hit-normal', // overridden for crits below
  healing_applied: 'sfx-spell-heal',
  condition_added: 'sfx-spell-cast',
}

// ─── Trigger Functions ──────────────────────

/**
 * Play the appropriate SFX for a game event.
 * Call this from the game event subscription.
 */
export function triggerSfxForEvent(
  eventType: GameEventType,
  data: Record<string, unknown> = {}
): void {
  // Special cases with data inspection
  switch (eventType) {
    case 'damage_dealt': {
      if (data.critical === true) {
        audioManager.playSfx('sfx-hit-critical')
      } else {
        audioManager.playSfx('sfx-hit-normal')
      }
      return
    }

    case 'action_performed': {
      const actionType = data.actionType as string | undefined
      if (actionType === 'cast') {
        // Determine spell element if available
        const element = data.element as string | undefined
        if (element === 'fire') {
          audioManager.playSfx('sfx-spell-fire')
        } else if (element === 'ice' || element === 'cold') {
          audioManager.playSfx('sfx-spell-ice')
        } else {
          audioManager.playSfx('sfx-spell-cast')
        }
        return
      }
      // No SFX for other action types by default
      return
    }

    default:
      break
  }

  // Default mapping
  const sfxId = EVENT_SFX_MAP[eventType]
  if (sfxId) {
    audioManager.playSfx(sfxId)
  }
}

// ─── Direct SFX Triggers ────────────────────
// Convenience functions for UI-driven SFX not tied to game events.

export function playDiceRoll(): void {
  audioManager.playSfx('sfx-dice-roll')
}

export function playDoorOpen(): void {
  audioManager.playSfx('sfx-door-open')
}

export function playDoorClose(): void {
  audioManager.playSfx('sfx-door-close')
}

export function playChestOpen(): void {
  audioManager.playSfx('sfx-chest-open')
}

export function playCoinDrop(): void {
  audioManager.playSfx('sfx-coin-drop')
}

export function playLevelUp(): void {
  audioManager.playSfx('sfx-level-up')
}

export function playMiss(): void {
  audioManager.playSfx('sfx-miss')
}

export function playDeath(): void {
  audioManager.playSfx('sfx-death')
}
```

**Commit:** `feat(audio): add SFX trigger system for game events`

---

### Task 7: Audio Player UI

**Files:**
- Create: `apps/web/components/game/audio/AudioPlayer.tsx`

- [ ] **Step 1: Build the audio player panel**

`apps/web/components/game/audio/AudioPlayer.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Volume2, VolumeX, Music, TreePine, Swords, ChevronUp, ChevronDown } from 'lucide-react'
import { useAudioStore } from '@/lib/stores/audio-store'
import type { AudioLayer } from '@/lib/audio/audio-assets'
import { getTrackById } from '@/lib/audio/audio-assets'

// ─── Layer Config ────────────────────────────

const LAYER_CONFIG: {
  layer: AudioLayer
  label: string
  icon: typeof Volume2
}[] = [
  { layer: 'music', label: 'Musik', icon: Music },
  { layer: 'ambience', label: 'Ambiente', icon: TreePine },
  { layer: 'sfx', label: 'Effekte', icon: Swords },
]

// ─── Volume Slider ───────────────────────────

function VolumeSlider({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-400"
      aria-label={label}
    />
  )
}

// ─── Layer Row ───────────────────────────────

function LayerRow({
  layer,
  label,
  icon: Icon,
}: {
  layer: AudioLayer
  label: string
  icon: typeof Volume2
}) {
  const volume = useAudioStore((s) => s.volumes[layer])
  const muted = useAudioStore((s) => s.muted[layer])
  const trackId = useAudioStore((s) => s.layers[layer].trackId)
  const setVolume = useAudioStore((s) => s.setVolume)
  const toggleMute = useAudioStore((s) => s.toggleMute)

  const track = trackId ? getTrackById(trackId) : null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => toggleMute(layer)}
        className="flex h-6 w-6 items-center justify-center text-neutral-400 hover:text-white"
        title={muted ? `${label} unmuten` : `${label} muten`}
      >
        {muted ? <VolumeX size={14} /> : <Icon size={14} />}
      </button>
      <div className="flex-1">
        <div className="mb-0.5 flex items-center justify-between">
          <span className="text-[10px] text-neutral-500">{label}</span>
          {track && (
            <span className="truncate text-[10px] text-neutral-600">{track.name}</span>
          )}
        </div>
        <VolumeSlider
          value={muted ? 0 : volume}
          onChange={(v) => setVolume(layer, v)}
          label={`${label} Lautstaerke`}
        />
      </div>
      <span className="w-7 text-right text-[10px] text-neutral-600">
        {muted ? '0' : Math.round(volume * 100)}
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────

export function AudioPlayer() {
  const [expanded, setExpanded] = useState(false)
  const masterVolume = useAudioStore((s) => s.masterVolume)
  const masterMuted = useAudioStore((s) => s.masterMuted)
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume)
  const toggleMasterMute = useAudioStore((s) => s.toggleMasterMute)

  return (
    <div className="absolute right-4 top-14 z-20 w-56">
      {/* Toggle Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-t-lg bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur-sm hover:bg-neutral-800/90"
      >
        <div className="flex items-center gap-2">
          {masterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>Audio</span>
        </div>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Panel */}
      {expanded && (
        <div className="rounded-b-lg bg-neutral-900/90 px-3 pb-3 pt-1 backdrop-blur-sm">
          {/* Master Volume */}
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={toggleMasterMute}
              className="flex h-6 w-6 items-center justify-center text-neutral-400 hover:text-white"
              title={masterMuted ? 'Ton an' : 'Ton aus'}
            >
              {masterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <div className="flex-1">
              <span className="mb-0.5 block text-[10px] text-neutral-500">Master</span>
              <VolumeSlider
                value={masterMuted ? 0 : masterVolume}
                onChange={setMasterVolume}
                label="Master Lautstaerke"
              />
            </div>
            <span className="w-7 text-right text-[10px] text-neutral-600">
              {masterMuted ? '0' : Math.round(masterVolume * 100)}
            </span>
          </div>

          {/* Divider */}
          <div className="mb-2 border-t border-neutral-800" />

          {/* Per-Layer Controls */}
          <div className="space-y-2">
            {LAYER_CONFIG.map(({ layer, label, icon }) => (
              <LayerRow key={layer} layer={layer} label={label} icon={icon} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Commit:** `feat(audio): add AudioPlayer UI with per-layer volume controls`

---

### Task 8: Audio Provider (Game Runtime Integration)

**Files:**
- Create: `apps/web/components/game/audio/AudioProvider.tsx`
- Modify: `apps/web/components/game/UIOverlay.tsx`

- [ ] **Step 1: Create AudioProvider that subscribes to game state**

`apps/web/components/game/audio/AudioProvider.tsx`:
```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/lib/stores/game-store'
import { useAudioStore } from '@/lib/stores/audio-store'
import { audioManager } from '@/lib/audio/audio-manager'
import { selectAudioForState } from '@/lib/audio/audio-scene-map'
import { triggerSfxForEvent } from '@/lib/audio/sfx-triggers'
import type { GameMode } from '@dndmanager/game-runtime'

/**
 * AudioProvider — invisible component that wires the audio system
 * to the game runtime. Mount once inside the game view.
 *
 * Responsibilities:
 * 1. On mode change → switch music (exploration ↔ combat)
 * 2. On map change → switch ambience
 * 3. On volume/mute change → sync Howl volumes
 * 4. On tab visibility → pause/resume
 * 5. Cleanup on unmount
 */
export function AudioProvider() {
  const prevModeRef = useRef<GameMode | null>(null)
  const prevMapRef = useRef<string | null>(null)

  // ─── Subscribe to game state for auto-switching ───

  useEffect(() => {
    const unsubGame = useGameStore.subscribe((state) => {
      const { mode, mapTiles } = state
      const prevMode = prevModeRef.current
      const prevMap = prevMapRef.current

      const modeChanged = prevMode !== null && prevMode !== mode
      const mapChanged = prevMap !== null && prevMap !== mapTiles

      // On mode change: switch music, play transition SFX
      if (modeChanged) {
        if (mode === 'encounter') {
          triggerSfxForEvent('encounter_start')
        } else if (prevMode === 'encounter') {
          triggerSfxForEvent('encounter_end')
        }

        const selection = selectAudioForState(mode, mapTiles)
        if (selection.musicTrackId) {
          audioManager.play('music', selection.musicTrackId)
        }
      }

      // On map change (or first load): switch ambience
      if (mapChanged || prevMap === null) {
        const selection = selectAudioForState(mode, mapTiles)
        if (selection.ambienceTrackId) {
          audioManager.play('ambience', selection.ambienceTrackId)
        }
      }

      // First load: start both layers
      if (prevMode === null) {
        const selection = selectAudioForState(mode, mapTiles)
        if (selection.ambienceTrackId) {
          audioManager.play('ambience', selection.ambienceTrackId)
        }
        if (selection.musicTrackId) {
          audioManager.play('music', selection.musicTrackId)
        }
      }

      prevModeRef.current = mode
      prevMapRef.current = mapTiles
    })

    return () => unsubGame()
  }, [])

  // ─── Subscribe to audio store for volume sync ───

  useEffect(() => {
    const unsubAudio = useAudioStore.subscribe(() => {
      audioManager.syncVolumes()
    })

    return () => unsubAudio()
  }, [])

  // ─── Tab visibility: pause when hidden ───

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        audioManager.pauseAll()
      } else {
        audioManager.resumeAll()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ─── Cleanup on unmount ───

  useEffect(() => {
    return () => {
      audioManager.destroy()
    }
  }, [])

  // Renders nothing — pure side-effect component
  return null
}
```

- [ ] **Step 2: Wire AudioProvider and AudioPlayer into UIOverlay**

Modify `apps/web/components/game/UIOverlay.tsx` — add imports and mount the audio components:

```typescript
'use client'

import { useGameStore } from '@/lib/stores/game-store'
import { ActionMenu } from './actions/ActionMenu'
import { AudioProvider } from './audio/AudioProvider'
import { AudioPlayer } from './audio/AudioPlayer'

// ... InitiativeBar and ActionBar unchanged ...

export function UIOverlay() {
  return (
    <>
      <AudioProvider />
      <AudioPlayer />
      <InitiativeBar />
      <ActionBar />
    </>
  )
}
```

**Commit:** `feat(audio): integrate AudioProvider with game runtime auto-switching`

---

### Task 9: Barrel Export

**Files:**
- Create: `apps/web/lib/audio/index.ts`

- [ ] **Step 1: Create barrel export for the audio module**

`apps/web/lib/audio/index.ts`:
```typescript
export { audioManager } from './audio-manager'
export {
  type AudioLayer,
  type AudioTrack,
  type AmbienceCategory,
  type MusicCategory,
  type SfxCategory,
  ALL_TRACKS,
  AMBIENCE_TRACKS,
  MUSIC_TRACKS,
  SFX_TRACKS,
  getTrackById,
  getTracksByLayer,
  getTracksByCategory,
  getRandomTrack,
} from './audio-assets'
export {
  type SceneType,
  type AudioSelection,
  parseSceneType,
  selectAudioForState,
  selectMusicForScene,
} from './audio-scene-map'
export {
  triggerSfxForEvent,
  playDiceRoll,
  playDoorOpen,
  playDoorClose,
  playChestOpen,
  playCoinDrop,
  playLevelUp,
  playMiss,
  playDeath,
} from './sfx-triggers'
```

**Commit:** `feat(audio): add barrel export for audio module`

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `package.json` | Add howler.js + @types/howler |
| 2 | `lib/audio/audio-assets.ts` | Track library: ambience, music, SFX definitions |
| 3 | `lib/stores/audio-store.ts` | Zustand store: volumes, mute, playback state (persisted) |
| 4 | `lib/audio/audio-manager.ts` | Core manager: Howler.js play/stop/crossfade per layer |
| 5 | `lib/audio/audio-scene-map.ts` | Map game state + map tiles to audio selections |
| 6 | `lib/audio/sfx-triggers.ts` | Game event to SFX dispatcher |
| 7 | `components/game/audio/AudioPlayer.tsx` | Volume controls UI (master + per-layer) |
| 8 | `components/game/audio/AudioProvider.tsx` + `UIOverlay.tsx` | Runtime integration: auto-switch on mode/map change |
| 9 | `lib/audio/index.ts` | Barrel export |

**Key design decisions:**
- **Howler.js with html5 mode** for streaming large ambience/music files without buffering the entire file
- **Singleton AudioManager** owns all Howl instances; Zustand store only tracks declarative state (what's playing, volumes)
- **Crossfade** on layer transitions (configurable per track via `fadeDuration`)
- **Max 8 concurrent SFX** to prevent audio overload
- **Volume preferences persisted** to localStorage via Zustand `persist` middleware
- **Tab visibility** pauses audio when user switches away
- **No audio files included** — placeholder URLs under `/audio/` that must be populated with actual `.webm` assets
