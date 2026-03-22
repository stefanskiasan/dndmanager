import { describe, it, expect } from 'vitest'
import { handleEffect } from '../triggers/effect-handlers.js'
import type { GameState } from '../types.js'
import type { TriggerEngineState } from '../triggers/types.js'
import type { TriggerEffect } from '@dndmanager/scene-framework'

function mockState(overrides?: Partial<GameState>): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
    ...overrides,
  }
}

function mockEngineState(): TriggerEngineState {
  return { triggers: [], bossPhases: [], roomEventLinks: [] }
}

describe('handleEffect', () => {
  describe('spawn effect', () => {
    it('adds new tokens to game state', () => {
      const effect: TriggerEffect = {
        type: 'spawn',
        monsters: [{ type: 'pf2e:shadow', count: 2 }],
        room: 'throne',
        positions: [[5, 3], [5, 4]],
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.state.tokens).toHaveLength(2)
      expect(result.events).toContainEqual(expect.objectContaining({ type: 'spawn_executed' }))
    })
  })

  describe('lighting effect', () => {
    it('emits lighting_changed event', () => {
      const effect: TriggerEffect = {
        type: 'lighting',
        room: 'throne',
        to: 'darkness',
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'lighting_changed', data: expect.objectContaining({ room: 'throne', to: 'darkness' }) })
      )
    })
  })

  describe('narrative effect', () => {
    it('emits narrative_displayed event with text', () => {
      const effect: TriggerEffect = {
        type: 'narrative',
        text: 'The ground shakes violently.',
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'narrative_displayed', data: expect.objectContaining({ text: 'The ground shakes violently.' }) })
      )
    })
  })

  describe('map_change effect', () => {
    it('emits map_changed event', () => {
      const effect: TriggerEffect = {
        type: 'map_change',
        mapId: 'underground-level2',
      }
      const result = handleEffect(effect, mockState(), mockEngineState())
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'map_changed', data: expect.objectContaining({ mapId: 'underground-level2' }) })
      )
    })
  })

  describe('trigger (chain) effect', () => {
    it('marks chained trigger as armed for re-evaluation', () => {
      const es = mockEngineState()
      es.triggers.push({
        id: 'chain-target',
        def: { id: 'chain-target', when: {}, effects: [] },
        status: 'armed',
        fireCount: 0,
        maxFires: 1,
      })
      const effect: TriggerEffect = {
        type: 'trigger',
        target: 'chain-target',
      }
      const result = handleEffect(effect, mockState(), es)
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'trigger_fired', data: expect.objectContaining({ triggerId: 'chain-target' }) })
      )
    })
  })

  it('returns unchanged state for unknown effect type', () => {
    const effect: TriggerEffect = { type: 'audio' as any, track: 'boss-music' }
    const state = mockState()
    const es = mockEngineState()
    const result = handleEffect(effect, state, es)
    expect(result.state).toEqual(state)
    expect(result.events).toHaveLength(0)
  })
})
