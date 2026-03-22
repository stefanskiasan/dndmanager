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
