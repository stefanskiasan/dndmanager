import { describe, it, expect } from 'vitest'
import { rollInitiative, sortInitiative, startEncounter } from '../initiative.js'
import { createGameState } from '../state-machine.js'
import { createToken } from '../tokens.js'
import type { InitiativeEntry, Token } from '../types.js'

describe('rollInitiative', () => {
  it('creates initiative entry for a token', () => {
    const entry = rollInitiative('thorin', 7, 14)
    expect(entry.tokenId).toBe('thorin')
    expect(entry.modifier).toBe(7)
    expect(entry.roll).toBe(14)
    expect(entry.total).toBe(21)
  })
})

describe('sortInitiative', () => {
  it('sorts by total descending', () => {
    const entries: InitiativeEntry[] = [
      { tokenId: 'a', roll: 10, modifier: 5, total: 15 },
      { tokenId: 'b', roll: 18, modifier: 3, total: 21 },
      { tokenId: 'c', roll: 12, modifier: 6, total: 18 },
    ]
    const sorted = sortInitiative(entries)
    expect(sorted.map((e) => e.tokenId)).toEqual(['b', 'c', 'a'])
  })

  it('breaks ties by modifier (higher goes first)', () => {
    const entries: InitiativeEntry[] = [
      { tokenId: 'a', roll: 10, modifier: 5, total: 15 },
      { tokenId: 'b', roll: 8, modifier: 7, total: 15 },
    ]
    const sorted = sortInitiative(entries)
    expect(sorted[0].tokenId).toBe('b')
  })
})

describe('startEncounter', () => {
  it('transitions to encounter mode', () => {
    const state = createGameState('session-1')
    const thorin = createToken({
      id: 'thorin', name: 'Thorin', type: 'player',
      ownerId: 'u1', position: { x: 0, y: 0 },
      speed: 25, ac: 18, hp: { current: 45, max: 45, temp: 0 },
    })
    const goblin = createToken({
      id: 'goblin', name: 'Goblin', type: 'monster',
      ownerId: 'gm', position: { x: 5, y: 5 },
      speed: 25, ac: 16, hp: { current: 20, max: 20, temp: 0 },
    })
    const stateWithTokens = { ...state, tokens: [thorin, goblin] }

    const initiatives: InitiativeEntry[] = [
      { tokenId: 'thorin', roll: 15, modifier: 7, total: 22 },
      { tokenId: 'goblin', roll: 12, modifier: 3, total: 15 },
    ]

    const result = startEncounter(stateWithTokens, initiatives)

    expect(result.mode).toBe('encounter')
    expect(result.round).toBe(1)
    expect(result.turnOrder).toEqual(['thorin', 'goblin'])
    expect(result.currentTurnIndex).toBe(0)
    expect(result.turn).not.toBeNull()
    expect(result.turn!.currentTokenId).toBe('thorin')
    expect(result.turn!.actionsRemaining).toBe(3)
    expect(result.turn!.reactionAvailable).toBe(true)
  })

  it('logs encounter_start and round_start events', () => {
    const state = createGameState('session-1')
    const initiatives: InitiativeEntry[] = [
      { tokenId: 'a', roll: 10, modifier: 5, total: 15 },
    ]
    const result = startEncounter(state, initiatives)
    const eventTypes = result.actionLog.map((e) => e.type)
    expect(eventTypes).toContain('mode_change')
    expect(eventTypes).toContain('encounter_start')
    expect(eventTypes).toContain('round_start')
    expect(eventTypes).toContain('turn_start')
  })
})
