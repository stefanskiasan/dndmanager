import { describe, it, expect } from 'vitest'
import { useGameStore } from '@/lib/stores/game-store'

describe('MapTransition', () => {
  it('exports MapTransition component', async () => {
    const mod = await import('../MapTransition')
    expect(mod.MapTransition).toBeDefined()
    expect(typeof mod.MapTransition).toBe('function')
  })
})

describe('game-store currentRoom', () => {
  it('initializes currentRoom as null', () => {
    useGameStore.getState().reset()
    expect(useGameStore.getState().currentRoom).toBeNull()
  })

  it('sets currentRoom', () => {
    useGameStore.getState().setCurrentRoom('dungeon-1')
    expect(useGameStore.getState().currentRoom).toBe('dungeon-1')
  })

  it('changes currentRoom triggers update', () => {
    useGameStore.getState().setCurrentRoom('dungeon-1')
    expect(useGameStore.getState().currentRoom).toBe('dungeon-1')

    useGameStore.getState().setCurrentRoom('dungeon-2')
    expect(useGameStore.getState().currentRoom).toBe('dungeon-2')
  })

  it('resets currentRoom', () => {
    useGameStore.getState().setCurrentRoom('dungeon-1')
    useGameStore.getState().reset()
    expect(useGameStore.getState().currentRoom).toBeNull()
  })
})
