import type { AudioLayer, AudioTrack } from './audio-assets'
import { getTrackById } from './audio-assets'
import { useAudioStore } from '@/lib/stores/audio-store'

// ─── Types ───────────────────────────────────

interface ActiveSound {
  howl: import('howler').Howl
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

  private activeSfx: import('howler').Howl[] = []
  private maxConcurrentSfx = 8

  /** Lazy-load Howler to avoid SSR issues */
  private async getHowler() {
    if (typeof window === 'undefined') return null
    const { Howl, Howler } = await import('howler')
    return { Howl, Howler }
  }

  // ─── Layer Playback ──────────────────────

  /**
   * Play a track on a layer (ambience or music).
   * If a track is already playing on that layer, crossfade to the new one.
   */
  async play(layer: 'ambience' | 'music', trackId: string): Promise<void> {
    const howler = await this.getHowler()
    if (!howler) return

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
    const howl = new howler.Howl({
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
  async playSfx(trackId: string): Promise<void> {
    const howler = await this.getHowler()
    if (!howler) return

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

    const howl = new howler.Howl({
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
  async pauseAll(): Promise<void> {
    const howler = await this.getHowler()
    if (!howler) return
    howler.Howler.mute(true)
  }

  /**
   * Resume all audio.
   */
  async resumeAll(): Promise<void> {
    const howler = await this.getHowler()
    if (!howler) return
    const store = useAudioStore.getState()
    howler.Howler.mute(store.masterMuted)
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
