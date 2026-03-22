import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token, GridPosition } from '@dndmanager/game-runtime'

describe('game store', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('initializes with default state', () => {
    const state = useGameStore.getState()
    expect(state.mode).toBe('exploration')
    expect(state.tokens).toEqual([])
    expect(state.selectedTokenId).toBeNull()
    expect(state.hoveredPosition).toBeNull()
  })

  it('sets tokens', () => {
    const token: Token = {
      id: 'thorin',
      name: 'Thorin',
      type: 'player',
      ownerId: 'user-1',
      position: { x: 3, y: 5 },
      speed: 25,
      conditions: [],
      hp: { current: 45, max: 45, temp: 0 },
      ac: 18,
      visible: true,
    }
    useGameStore.getState().setTokens([token])
    expect(useGameStore.getState().tokens).toHaveLength(1)
  })

  it('selects and deselects token', () => {
    useGameStore.getState().selectToken('thorin')
    expect(useGameStore.getState().selectedTokenId).toBe('thorin')

    useGameStore.getState().selectToken(null)
    expect(useGameStore.getState().selectedTokenId).toBeNull()
  })

  it('updates hovered position', () => {
    useGameStore.getState().setHoveredPosition({ x: 5, y: 3 })
    expect(useGameStore.getState().hoveredPosition).toEqual({ x: 5, y: 3 })
  })

  it('moves token', () => {
    const token: Token = {
      id: 'thorin',
      name: 'Thorin',
      type: 'player',
      ownerId: 'user-1',
      position: { x: 0, y: 0 },
      speed: 25,
      conditions: [],
      hp: { current: 45, max: 45, temp: 0 },
      ac: 18,
      visible: true,
    }
    useGameStore.getState().setTokens([token])
    useGameStore.getState().moveToken('thorin', { x: 3, y: 2 })
    expect(useGameStore.getState().tokens[0].position).toEqual({ x: 3, y: 2 })
  })

  it('sets game mode', () => {
    useGameStore.getState().setMode('encounter')
    expect(useGameStore.getState().mode).toBe('encounter')
  })
})
