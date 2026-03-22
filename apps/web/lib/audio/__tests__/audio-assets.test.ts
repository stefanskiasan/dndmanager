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
