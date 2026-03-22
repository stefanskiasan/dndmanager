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
