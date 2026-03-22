import { describe, it, expect } from 'vitest'
import { evaluateCondition } from '../triggers/condition-evaluator.js'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState } from '../triggers/types.js'
import type { TriggerCondition } from '@dndmanager/scene-framework'

function mockState(overrides?: Partial<GameState>): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'exploration',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 0, actionLog: [],
    ...overrides,
  }
}

function mockEngineState(): TriggerEngineState {
  return { triggers: [], bossPhases: [], roomEventLinks: [] }
}

describe('evaluateCondition', () => {
  it('returns true when encounter condition matches encounter_start event', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight' }
    const event: GameEvent = {
      type: 'encounter_start',
      timestamp: 1,
      data: { encounterId: 'boss-fight' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('returns false when encounter ID does not match', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight' }
    const event: GameEvent = {
      type: 'encounter_start',
      timestamp: 1,
      data: { encounterId: 'guard-patrol' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(false)
  })

  it('matches room_entered condition on token_moved event', () => {
    const cond: TriggerCondition = { room_entered: 'throne-room' }
    const event: GameEvent = {
      type: 'token_moved',
      timestamp: 1,
      data: { tokenId: 't1', roomId: 'throne-room' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('matches boss phase condition on boss_phase_entered event', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight', phase: 'flee' }
    const event: GameEvent = {
      type: 'boss_phase_entered',
      timestamp: 1,
      data: { encounterId: 'boss-fight', phase: 'flee' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('matches item_used condition on action_performed event', () => {
    const cond: TriggerCondition = { item_used: 'golden-key' }
    const event: GameEvent = {
      type: 'action_performed',
      timestamp: 1,
      data: { type: 'use_item', itemId: 'golden-key' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('returns true for empty condition (always-true trigger)', () => {
    const cond: TriggerCondition = {}
    const event: GameEvent = { type: 'round_start', timestamp: 1, data: {} }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(true)
  })

  it('requires ALL conditions to match (AND semantics)', () => {
    const cond: TriggerCondition = { encounter: 'boss-fight', phase: 'rage' }
    const event: GameEvent = {
      type: 'boss_phase_entered',
      timestamp: 1,
      data: { encounterId: 'boss-fight', phase: 'flee' },
    }
    expect(evaluateCondition(cond, event, mockState(), mockEngineState())).toBe(false)
  })
})
