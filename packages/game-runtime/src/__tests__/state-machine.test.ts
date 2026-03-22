import { describe, it, expect } from 'vitest'
import { createGameState, transitionMode, canTransition } from '../state-machine.js'
import type { GameMode } from '../types.js'

describe('createGameState', () => {
  it('creates initial state in exploration mode', () => {
    const state = createGameState('session-1')
    expect(state.mode).toBe('exploration')
    expect(state.tokens).toEqual([])
    expect(state.initiative).toEqual([])
    expect(state.turnOrder).toEqual([])
    expect(state.currentTurnIndex).toBe(-1)
    expect(state.turn).toBeNull()
    expect(state.round).toBe(0)
    expect(state.actionLog).toEqual([])
  })
})

describe('canTransition', () => {
  it('exploration → encounter: allowed', () => {
    expect(canTransition('exploration', 'encounter')).toBe(true)
  })

  it('exploration → downtime: allowed', () => {
    expect(canTransition('exploration', 'downtime')).toBe(true)
  })

  it('encounter → exploration: allowed', () => {
    expect(canTransition('encounter', 'exploration')).toBe(true)
  })

  it('encounter → downtime: not allowed (must go through exploration)', () => {
    expect(canTransition('encounter', 'downtime')).toBe(false)
  })

  it('downtime → exploration: allowed', () => {
    expect(canTransition('downtime', 'exploration')).toBe(true)
  })

  it('downtime → encounter: not allowed (must go through exploration)', () => {
    expect(canTransition('downtime', 'encounter')).toBe(false)
  })

  it('same mode: not allowed', () => {
    expect(canTransition('exploration', 'exploration')).toBe(false)
  })
})

describe('transitionMode', () => {
  it('transitions exploration → encounter', () => {
    const state = createGameState('session-1')
    const next = transitionMode(state, 'encounter')
    expect(next.mode).toBe('encounter')
  })

  it('logs mode_change event', () => {
    const state = createGameState('session-1')
    const next = transitionMode(state, 'encounter')
    expect(next.actionLog).toHaveLength(1)
    expect(next.actionLog[0].type).toBe('mode_change')
  })

  it('resets encounter state when leaving encounter', () => {
    let state = createGameState('session-1')
    state = { ...state, mode: 'encounter', round: 3, currentTurnIndex: 2 }
    const next = transitionMode(state, 'exploration')
    expect(next.round).toBe(0)
    expect(next.currentTurnIndex).toBe(-1)
    expect(next.turn).toBeNull()
    expect(next.initiative).toEqual([])
    expect(next.turnOrder).toEqual([])
  })

  it('throws for invalid transition', () => {
    const state = { ...createGameState('session-1'), mode: 'encounter' as GameMode }
    expect(() => transitionMode(state, 'downtime')).toThrow()
  })
})
