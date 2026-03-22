import { describe, it, expect } from 'vitest'
import { useAction, endTurn, nextTurn, useReaction, getCurrentToken } from '../turns.js'
import { createGameState } from '../state-machine.js'
import { startEncounter } from '../initiative.js'
import type { GameState, TurnState, InitiativeEntry } from '../types.js'

function setupEncounterState(): GameState {
  const state = createGameState('session-1')
  const initiatives: InitiativeEntry[] = [
    { tokenId: 'thorin', roll: 15, modifier: 7, total: 22 },
    { tokenId: 'goblin', roll: 12, modifier: 3, total: 15 },
  ]
  return startEncounter(state, initiatives)
}

describe('useAction', () => {
  it('decrements actions remaining', () => {
    const state = setupEncounterState()
    const next = useAction(state, { type: 'strike', details: 'Longsword attack' })
    expect(next.turn!.actionsRemaining).toBe(2)
  })

  it('records action in actionsUsed', () => {
    const state = setupEncounterState()
    const next = useAction(state, { type: 'strike', details: 'Longsword attack' })
    expect(next.turn!.actionsUsed).toHaveLength(1)
    expect(next.turn!.actionsUsed[0].type).toBe('strike')
  })

  it('logs action_performed event', () => {
    const state = setupEncounterState()
    const next = useAction(state, { type: 'move', details: 'Stride 25ft' })
    const lastEvent = next.actionLog[next.actionLog.length - 1]
    expect(lastEvent.type).toBe('action_performed')
  })

  it('throws when no actions remaining', () => {
    let state = setupEncounterState()
    state = useAction(state, { type: 'strike', details: '1st' })
    state = useAction(state, { type: 'strike', details: '2nd' })
    state = useAction(state, { type: 'strike', details: '3rd' })
    expect(() => useAction(state, { type: 'strike', details: '4th' })).toThrow()
  })

  it('throws when not in encounter', () => {
    const state = createGameState('session-1')
    expect(() => useAction(state, { type: 'strike', details: 'attack' })).toThrow()
  })
})

describe('useReaction', () => {
  it('marks reaction as used', () => {
    const state = setupEncounterState()
    const next = useReaction(state, { type: 'reactive-strike', details: 'AoO' })
    expect(next.turn!.reactionAvailable).toBe(false)
  })

  it('throws when reaction already used', () => {
    let state = setupEncounterState()
    state = useReaction(state, { type: 'reactive-strike', details: 'AoO' })
    expect(() => useReaction(state, { type: 'shield-block', details: 'block' })).toThrow()
  })
})

describe('endTurn / nextTurn', () => {
  it('advances to next token in turn order', () => {
    const state = setupEncounterState()
    expect(state.turn!.currentTokenId).toBe('thorin')

    const next = nextTurn(state)
    expect(next.turn!.currentTokenId).toBe('goblin')
    expect(next.currentTurnIndex).toBe(1)
  })

  it('wraps to round start and increments round', () => {
    let state = setupEncounterState()
    state = nextTurn(state) // goblin's turn
    state = nextTurn(state) // back to thorin, round 2

    expect(state.turn!.currentTokenId).toBe('thorin')
    expect(state.round).toBe(2)
    expect(state.currentTurnIndex).toBe(0)
  })

  it('resets actions and reaction for new turn', () => {
    let state = setupEncounterState()
    state = useAction(state, { type: 'strike', details: 'attack' })
    state = useReaction(state, { type: 'reactive-strike', details: 'AoO' })

    const next = nextTurn(state)
    expect(next.turn!.actionsRemaining).toBe(3)
    expect(next.turn!.reactionAvailable).toBe(true)
    expect(next.turn!.actionsUsed).toEqual([])
  })

  it('logs turn_end and turn_start events', () => {
    const state = setupEncounterState()
    const next = nextTurn(state)
    const eventTypes = next.actionLog.map((e) => e.type)
    expect(eventTypes).toContain('turn_end')
    expect(eventTypes).toContain('turn_start')
  })

  it('logs round_start when wrapping', () => {
    let state = setupEncounterState()
    state = nextTurn(state)
    state = nextTurn(state) // wraps
    const roundStarts = state.actionLog.filter((e) => e.type === 'round_start')
    expect(roundStarts).toHaveLength(2) // initial + wrap
  })
})

describe('getCurrentToken', () => {
  it('returns current turn token ID', () => {
    const state = setupEncounterState()
    expect(getCurrentToken(state)).toBe('thorin')
  })

  it('returns null when not in encounter', () => {
    const state = createGameState('session-1')
    expect(getCurrentToken(state)).toBeNull()
  })
})
